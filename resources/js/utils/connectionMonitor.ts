/**
 * Connection Monitor
 *
 * Monitors online/offline status and provides reliable connectivity detection.
 * Combines navigator.onLine API with server ping for accurate status.
 */

export type ConnectionListener = (isOnline: boolean) => void;

export class ConnectionMonitor {
    private listeners: ConnectionListener[] = [];
    private checkInterval: number | null = null;
    private isDestroyed = false;
    private currentStatus: boolean = navigator.onLine;

    constructor() {
        this.initialize();
    }

    private initialize() {
        // Listen to browser online/offline events
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);

        // Start periodic server ping to verify real connectivity
        this.startPeriodicCheck();

        // Do initial connectivity check
        this.performConnectivityCheck();
    }

    private handleOnline = () => {
        this.updateStatus(true);
        // Verify with server ping
        this.performConnectivityCheck();
    };

    private handleOffline = () => {
        this.updateStatus(false);
    };

    private updateStatus(isOnline: boolean) {
        if (this.currentStatus !== isOnline) {
            this.currentStatus = isOnline;
            this.notifyListeners(isOnline);
        }
    }

    private startPeriodicCheck() {
        // Ping server every 30 seconds to verify real connectivity
        this.checkInterval = window.setInterval(() => {
            if (!this.isDestroyed) {
                this.performConnectivityCheck();
            }
        }, 30000); // 30 seconds
    }

    private async performConnectivityCheck() {
        const isReachable = await this.pingServer();

        // If navigator.onLine says we're online but server is unreachable, we're actually offline
        if (!isReachable && navigator.onLine) {
            this.updateStatus(false);
        } else if (isReachable && !this.currentStatus) {
            this.updateStatus(true);
        }
    }

    private async pingServer(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const response = await fetch('/api/ping', {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-store', // Don't cache ping requests
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            // Fetch failed - could be network error, timeout, or server unreachable
            return false;
        }
    }

    /**
     * Subscribe to connection status changes
     * @param callback Function to call when status changes
     * @returns Unsubscribe function
     */
    public onChange(callback: ConnectionListener): () => void {
        this.listeners.push(callback);

        // Immediately call with current status
        callback(this.currentStatus);

        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private notifyListeners(isOnline: boolean) {
        this.listeners.forEach(listener => {
            try {
                listener(isOnline);
            } catch (error) {
                console.error('Error in connection listener:', error);
            }
        });
    }

    /**
     * Get current connection status
     */
    public getStatus(): boolean {
        return this.currentStatus;
    }

    /**
     * Manually trigger a connectivity check
     */
    public async checkNow(): Promise<boolean> {
        await this.performConnectivityCheck();
        return this.currentStatus;
    }

    /**
     * Clean up resources
     */
    public destroy() {
        this.isDestroyed = true;

        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);

        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        this.listeners = [];
    }
}

// Export singleton instance
export const connectionMonitor = new ConnectionMonitor();

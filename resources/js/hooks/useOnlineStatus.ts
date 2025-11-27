/**
 * useOnlineStatus Hook
 *
 * React hook that provides the current online/offline status.
 * Updates automatically when connection status changes.
 */

import { useState, useEffect } from 'react';
import { connectionMonitor } from '@/utils/connectionMonitor';

export interface OnlineStatusResult {
    isOnline: boolean;
    checkNow: () => Promise<boolean>;
}

export function useOnlineStatus(): OnlineStatusResult {
    const [isOnline, setIsOnline] = useState<boolean>(connectionMonitor.getStatus());

    useEffect(() => {
        // Subscribe to connection status changes
        const unsubscribe = connectionMonitor.onChange((status) => {
            setIsOnline(status);
        });

        // Cleanup subscription on unmount
        return unsubscribe;
    }, []);

    // Provide manual check function
    const checkNow = async () => {
        const status = await connectionMonitor.checkNow();
        return status;
    };

    return {
        isOnline,
        checkNow,
    };
}

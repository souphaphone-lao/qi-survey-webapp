/**
 * PWA Service Worker Registration
 *
 * Registers the service worker for offline functionality
 */

export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.warn('[PWA] Service workers are not supported in this browser');
        return;
    }

    window.addEventListener('load', async () => {
        try {
            // Register the service worker (works in both dev and production)
            const swUrl = import.meta.env.PROD ? '/sw.js' : '/dev-sw.js?dev-sw';

            const registration = await navigator.serviceWorker.register(swUrl, {
                scope: '/',
                type: 'module',
            });

            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[PWA] New version available! Refresh to update.');
                        }
                    });
                }
            });
        } catch (error) {
            console.error('[PWA] Service worker registration failed:', error);
        }
    });
}

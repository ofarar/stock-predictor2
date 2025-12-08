import { APP_URL } from '../constants';

/**
 * Returns the base URL for sharing links.
 * If running on localhost (Capacitor/Phone), it returns the production domain.
 * Otherwise, it uses the current window location.
 */
export const getShareBaseUrl = () => {
    // Check if we are on localhost (e.g., Capacitor app)
    // We check port !== '5173' because 5173 is usually the local dev server where we MIGHT want localhost links.
    // But typically for sharing we always want prod links if possible, or at least consistent ones.
    // However, the user specifically mentioned "on android... url is localhost".
    // Android Capacitor runs on http://localhost (no port usually, or specific port).

    // Simplest check: if hostname is 'localhost', use Prod URL.
    // Unless matches dev port 5173 (optional, but good for local web dev).
    if (window.location.hostname === 'localhost' && window.location.port !== '5173') {
        return APP_URL;
    }

    return window.location.origin;
};

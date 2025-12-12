import { useEffect } from 'react';

/**
 * Custom hook to lock the body scroll when a component is mounted/open.
 * @param {boolean} isOpen - Whether the modal/component is open.
 */
const useLockBodyScroll = (isOpen) => {
    useEffect(() => {
        if (isOpen) {
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';

            return () => {
                document.body.style.overflow = originalStyle;
            };
        }
    }, [isOpen]);
};

export default useLockBodyScroll;

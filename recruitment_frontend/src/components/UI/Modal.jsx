import { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children, size = 'md', variant = 'modal', width = 'default' }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Handle ESC key press
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    if (variant === 'panel') {
        return (
            <div className="fixed inset-0 z-[70] overflow-hidden">
                <div
                    className="absolute inset-0 bg-gray-900/50 transition-opacity"
                    onClick={onClose}
                    aria-hidden="true"
                />
                <div
                    className="absolute top-0 right-0 bottom-0 left-0 lg:left-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col"
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-4 border-b border-gray-100 px-4 py-4 bg-white flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md bg-blue-600 p-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            aria-label="Close modal"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                        <div className="max-w-4xl mx-auto w-full">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const sizeClasses = {
        sm: 'sm:max-w-md',
        md: 'sm:max-w-3xl',
        lg: 'sm:max-w-4xl',
        xl: 'sm:max-w-5xl'
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-gray-900/50 px-4 py-8 sm:py-12">
            <div
                className="absolute inset-0"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                className={`relative w-full ${sizeClasses[size]} max-h-[90vh] transform rounded-2xl bg-white shadow-2xl transition-all flex flex-col my-auto`}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label="Close modal"
                    >
                        ✕
                    </button>
                </div>
                <div className="px-6 py-5 sm:px-8 sm:py-6 overflow-y-auto flex-1">{children}</div>
            </div>
        </div>
    );
};

export default Modal;

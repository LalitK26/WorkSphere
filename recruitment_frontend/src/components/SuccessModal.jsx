import { FiCheckCircle } from 'react-icons/fi';

const SuccessModal = ({
    isOpen,
    onClose,
    title = "Success",
    message,
    buttonText = "OK"
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        // Prevent closing by clicking outside to ensure explicit acknowledgement
        >
            <div
                className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center transform transition-all scale-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-short">
                    <FiCheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {title}
                </h3>
                <p className="text-gray-600 mb-6">
                    {message}
                </p>
                <button
                    onClick={onClose}
                    className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium shadow-md hover:shadow-lg focus:ring-4 focus:ring-green-500/30 outline-none"
                    autoFocus
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
};

export default SuccessModal;

const OfferStatusBadge = ({ status }) => {
    const getStatusStyles = () => {
        switch (status) {
            case 'CREATED':
                return 'bg-gray-100 text-gray-800 border-gray-300';
            case 'SENT':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'ACCEPTED':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'REJECTED':
                return 'bg-red-100 text-red-800 border-red-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'CREATED':
                return 'Created';
            case 'SENT':
                return 'Sent';
            case 'ACCEPTED':
                return 'Accepted';
            case 'REJECTED':
                return 'Rejected';
            default:
                return status;
        }
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles()}`}
        >
            {getStatusText()}
        </span>
    );
};

export default OfferStatusBadge;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import offerService from '../../api/offerService';
import OfferStatusBadge from '../../components/Offers/OfferStatusBadge';
import { FiBriefcase, FiLoader, FiCalendar, FiFileText, FiArrowRight, FiClock, FiCheckCircle, FiXCircle, FiAward } from 'react-icons/fi';
import {
    addNotification,
    getNotifiedOfferIds,
    markOfferNotified,
} from '../../utils/notificationStorage';

const MyOffers = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user?.userId == null) return;
        fetchMyOffers();
    }, [user?.userId]);

    const fetchMyOffers = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await offerService.getMyOffers();
            const list = Array.isArray(data) ? data : [];
            setOffers(list);
            const uid = user?.userId != null ? String(user.userId) : null;
            const notified = getNotifiedOfferIds();
            for (const o of list) {
                if (!o?.id || o.status !== 'SENT') continue;
                const oid = Number(o.id);
                if (isNaN(oid)) continue;
                if (!notified.has(oid)) {
                    try {
                        addNotification(uid, {
                            title: 'Offer letter sent',
                            message: `You have received an offer for ${o.jobTitle ?? o.position ?? 'a position'}. Please review and respond.`,
                            redirectPath: `/my-offers/${o.id}`,
                        });
                        markOfferNotified(oid);
                    } catch (_) { }
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load offers');
            console.error('Error fetching offers:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <FiLoader className="animate-spin text-5xl text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading your offers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] px-4 sm:px-6 lg:px-8 py-4">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shadow-sm mt-0.5">
                            <FiAward className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">My Offers</h1>
                            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5 sm:mt-1">
                                View and respond to your offer letters
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-semibold">{offers.length}</span>
                        <span>Offers</span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                {offers.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                            <FiFileText className="text-4xl text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Offers Yet</h3>
                        <p className="text-sm text-gray-500">
                            You haven't received any offer letters yet. Check back later!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {offers.map((offer) => (
                            <div
                                key={offer.id}
                                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer"
                                onClick={() => navigate(`/my-offers/${offer.id}`)}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-gray-900">{offer.jobTitle}</h3>
                                            <OfferStatusBadge status={offer.status} />
                                        </div>
                                        <p className="text-sm text-gray-600 mb-1">
                                            <span className="font-semibold">Position:</span> {offer.position}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-semibold">Department:</span> {offer.department}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 ml-4">
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                            <FiBriefcase className="text-xl text-blue-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pt-4 border-t border-gray-100">
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium mb-1">Employee ID</p>
                                        <p className="text-sm font-mono font-semibold text-gray-900">{offer.employeeId}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium mb-1">Offer Date</p>
                                        <p className="text-sm text-gray-900 flex items-center gap-1">
                                            <FiCalendar className="text-gray-400" />
                                            {formatDate(offer.offerDate)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium mb-1">Joining Date</p>
                                        <p className="text-sm text-gray-900 flex items-center gap-1">
                                            <FiCalendar className="text-gray-400" />
                                            {formatDate(offer.joiningDate)}
                                        </p>
                                    </div>
                                </div>

                                {offer.status === 'SENT' && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-amber-700 font-medium flex items-center gap-2">
                                                <FiClock /> Action Required: Please review and respond to this offer
                                            </p>
                                            <FiArrowRight className="text-blue-600" />
                                        </div>
                                    </div>
                                )}

                                {offer.status === 'ACCEPTED' && offer.respondedAt && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <p className="text-sm text-green-700 flex items-center gap-2">
                                            <FiCheckCircle /> Accepted on {formatDate(offer.respondedAt)}
                                        </p>
                                    </div>
                                )}

                                {offer.status === 'REJECTED' && offer.respondedAt && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <p className="text-sm text-red-700 flex items-center gap-2">
                                            <FiXCircle /> Rejected on {formatDate(offer.respondedAt)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyOffers;

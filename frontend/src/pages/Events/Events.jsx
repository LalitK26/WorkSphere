import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import Layout from '../../components/Layout';
import AddEventModal from '../../components/Events/AddEventModal';
import eventsApi from '../../api/eventsApi';
import { useAuth } from '../../context/AuthContext';
import './events.css';

const Events = () => {
    const { isAdmin, getModulePermission } = useAuth();
    const [events, setEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    // Get permissions for Events module
    const canAdd = isAdmin() || getModulePermission('Events', 'add') !== 'None';
    const canUpdate = isAdmin() || getModulePermission('Events', 'update') !== 'None';
    const canDelete = isAdmin() || getModulePermission('Events', 'delete') !== 'None';

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const data = await eventsApi.getEvents();

            // Transform events for FullCalendar
            const transformedEvents = data.map(event => ({
                id: event.id,
                title: event.eventName,
                start: `${event.startsOnDate}T${event.startsOnTime}`,
                end: `${event.endsOnDate}T${event.endsOnTime}`,
                extendedProps: {
                    where: event.where,
                    description: event.description,
                    status: event.status,
                    eventLink: event.eventLink,
                    departments: event.departments,
                    employees: event.employees,
                    createdByName: event.createdByName,
                },
                backgroundColor: getStatusColor(event.status),
                borderColor: getStatusColor(event.status),
            }));

            setEvents(transformedEvents);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING':
                return '#f59e0b'; // amber
            case 'COMPLETED':
                return '#10b981'; // green
            case 'CANCELLED':
                return '#ef4444'; // red
            default:
                return '#3b82f6'; // blue
        }
    };

    const handleAddEvent = () => {
        setSelectedEvent(null);
        setShowModal(true);
    };

    const handleEventClick = (clickInfo) => {
        if (!canUpdate) return; // Only users with update permission can edit

        const event = clickInfo.event;
        setSelectedEvent({
            id: event.id,
            eventName: event.title,
            where: event.extendedProps.where,
            description: event.extendedProps.description,
            startsOnDate: event.start.toISOString().split('T')[0],
            startsOnTime: event.start.toTimeString().slice(0, 5),
            endsOnDate: event.end.toISOString().split('T')[0],
            endsOnTime: event.end.toTimeString().slice(0, 5),
            status: event.extendedProps.status,
            eventLink: event.extendedProps.eventLink,
            departments: event.extendedProps.departments,
            employees: event.extendedProps.employees,
        });
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedEvent(null);
    };

    const handleEventSaved = () => {
        fetchEvents();
        handleModalClose();
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="hidden">
                        {/* Page title removed - shown in topbar */}
                    </div>
                    {canAdd && (
                        <button
                            onClick={handleAddEvent}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            + Add Event
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Employee
                            </label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option>All</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Client
                            </label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option>All</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option>All</option>
                                <option>Pending</option>
                                <option>Completed</option>
                                <option>Cancelled</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Search
                            </label>
                            <input
                                type="text"
                                placeholder="Start typing to search"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Calendar */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-96">
                            <div className="text-gray-500">Loading events...</div>
                        </div>
                    ) : (
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                            }}
                            events={events}
                            eventClick={handleEventClick}
                            nowIndicator={true}
                            editable={false}
                            selectable={false}
                            selectMirror={true}
                            dayMaxEvents={true}
                            height="auto"
                            contentHeight="auto"
                            aspectRatio={1.8}
                            views={{
                                dayGridMonth: { buttonText: 'month' },
                                timeGridWeek: { buttonText: 'week' },
                                timeGridDay: { buttonText: 'day' },
                                listWeek: { buttonText: 'list' }
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Add/Edit Event Modal */}
            {showModal && (
                <AddEventModal
                    event={selectedEvent}
                    onClose={handleModalClose}
                    onSave={handleEventSaved}
                />
            )}
        </Layout>
    );
};

export default Events;

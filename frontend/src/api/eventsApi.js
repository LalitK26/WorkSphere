import apiClient from './apiClient';

const eventsApi = {
    // Get all events (role-based filtering on backend)
    getEvents: async () => {
        const response = await apiClient.get('/events');
        return response.data;
    },

    // Get event by ID
    getEventById: async (id) => {
        const response = await apiClient.get(`/events/${id}`);
        return response.data;
    },

    // Create new event
    createEvent: async (eventData) => {
        const response = await apiClient.post('/events', eventData);
        return response.data;
    },

    // Update event
    updateEvent: async (id, eventData) => {
        const response = await apiClient.put(`/events/${id}`, eventData);
        return response.data;
    },

    // Delete event
    deleteEvent: async (id) => {
        await apiClient.delete(`/events/${id}`);
    },
};

export default eventsApi;

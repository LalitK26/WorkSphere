import apiClient from './apiClient';

export const shiftRosterService = {
  getRoster: (year, month, search = '', page = 0, size = 10) => {
    const params = new URLSearchParams({
      year: year.toString(),
      month: month.toString(),
      page: page.toString(),
      size: size.toString(),
    });
    if (search) {
      params.append('search', search);
    }
    return apiClient.get(`/shift-roster?${params.toString()}`);
  },
  assignBulk: (data) => apiClient.post('/shift-roster/assign', data),
  updateDay: (data) => apiClient.post('/shift-roster/update', data),
};



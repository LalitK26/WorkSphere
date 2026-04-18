import apiClient from './apiClient';

export const attendanceService = {
  getMyAttendance: () => apiClient.get('/attendance/my-attendance'),
  getByMonth: (year, month) => apiClient.get(`/attendance/month?year=${year}&month=${month}`),
  getAllByMonth: (year, month) => apiClient.get(`/attendance/all-month?year=${year}&month=${month}`),
  getByEmployeeAndMonth: (employeeId, year, month) => apiClient.get(`/attendance/employee/${employeeId}/month?year=${year}&month=${month}`),
  getById: (id) => apiClient.get(`/attendance/${id}`),
  clockIn: (locationData) => apiClient.post('/attendance/clock-in', locationData || {}),
  clockOut: (locationData) => apiClient.post('/attendance/clock-out', locationData || {}),
  updateLocation: (locationData) => apiClient.put('/attendance/update-location', locationData || {}),
  getTodayLocations: () => apiClient.get('/attendance/today-locations'),
  getTodayClockedIn: () => apiClient.get('/attendance/today-clocked-in'),
  markAttendance: (data) => apiClient.post('/attendance', data),
  markBulkAttendance: (data) => apiClient.post('/attendance/bulk', data),
  update: (id, data) => apiClient.put(`/attendance/${id}`, data),
  delete: (id) => apiClient.delete(`/attendance/${id}`),
};


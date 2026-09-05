import api from './axios'

export const attendanceApi = {
  getAll: (params) => api.get('/attendance', { params }).then((r) => r.data),
  getOne: (id) => api.get(`/attendance/${id}`).then((r) => r.data),
  getTodaySession: (employeeId) =>
    api.get('/attendance/today', { params: employeeId ? { employeeId } : {} }).then((r) => r.data),
  checkIn: () => api.post('/attendance/checkin').then((r) => r.data),
  checkOut: () => api.post('/attendance/checkout').then((r) => r.data),
  create: (data) => api.post('/attendance', data).then((r) => r.data),
  update: (id, data) => api.put(`/attendance/${id}`, data).then((r) => r.data),
  autoAbsent: (data = {}) => api.post('/attendance/auto-absent', data).then((r) => r.data),
}

export default attendanceApi

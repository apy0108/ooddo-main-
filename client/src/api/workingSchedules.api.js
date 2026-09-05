import api from './axios'

export const workingSchedulesApi = {
  getAll:  (params) => api.get('/working-schedules', { params }).then((r) => r.data),
  getOne:  (id)     => api.get(`/working-schedules/${id}`).then((r) => r.data),
  create:  (data)   => api.post('/working-schedules', data).then((r) => r.data),
  update:  (id, data) => api.put(`/working-schedules/${id}`, data).then((r) => r.data),
  remove:  (id)     => api.delete(`/working-schedules/${id}`).then((r) => r.data),
}

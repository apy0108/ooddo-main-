import api from './axios'

export const employeesApi = {
  getAll: (params) => api.get('/employees', { params }).then((r) => r.data),
  getOne: (id) => api.get(`/employees/${id}`).then((r) => r.data),
  getCounts: (id) => api.get(`/employees/${id}/counts`).then((r) => r.data),
  create: (data) => api.post('/employees', data).then((r) => r.data),
  update: (id, data) => api.put(`/employees/${id}`, data).then((r) => r.data),
  archive: (id) => api.patch(`/employees/${id}/archive`).then((r) => r.data),
}

export const departmentsApi = {
  getAll: () => api.get('/departments').then((r) => r.data),
  create: (data) => api.post('/departments', data).then((r) => r.data),
  update: (id, data) => api.put(`/departments/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/departments/${id}`).then((r) => r.data),
}

export const jobPositionsApi = {
  getAll: () => api.get('/job-positions').then((r) => r.data),
  create: (data) => api.post('/job-positions', data).then((r) => r.data),
  update: (id, data) => api.put(`/job-positions/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/job-positions/${id}`).then((r) => r.data),
}

export const schedulesApi = {
  getAll: () => api.get('/working-schedules').then((r) => r.data),
}

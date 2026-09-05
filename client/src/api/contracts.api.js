import api from './axios'

export const contractsApi = {
  getAll:    (params)    => api.get('/contracts', { params }).then((r) => r.data),
  getOne:    (id)        => api.get(`/contracts/${id}`).then((r) => r.data),
  create:    (data)      => api.post('/contracts', data).then((r) => r.data),
  update:    (id, data)  => api.put(`/contracts/${id}`, data).then((r) => r.data),
  activate:  (id)        => api.patch(`/contracts/${id}/activate`).then((r) => r.data),
  cancel:    (id)        => api.patch(`/contracts/${id}/cancel`).then((r) => r.data),
}

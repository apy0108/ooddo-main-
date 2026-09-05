import api from './axios'

// Types
export const getTimeOffTypes = (params) => api.get('/time-off/types', { params }).then((r) => r.data)
export const getTimeOffType = (id) => api.get(`/time-off/types/${id}`).then((r) => r.data)
export const createTimeOffType = (data) => api.post('/time-off/types', data).then((r) => r.data)
export const updateTimeOffType = (id, data) => api.put(`/time-off/types/${id}`, data).then((r) => r.data)
export const toggleTimeOffType = (id) => api.patch(`/time-off/types/${id}/toggle`).then((r) => r.data)

// Allocations
export const getAllocations = (params) => api.get('/time-off/allocations', { params }).then((r) => r.data)
export const getAllocation = (id) => api.get(`/time-off/allocations/${id}`).then((r) => r.data)
export const createAllocation = (data) => api.post('/time-off/allocations', data).then((r) => r.data)
export const approveAllocation = (id) => api.post(`/time-off/allocations/${id}/approve`).then((r) => r.data)
export const refuseAllocation = (id, data) => api.post(`/time-off/allocations/${id}/refuse`, data).then((r) => r.data)
export const getBalance = (eId, tId) => api.get(`/time-off/balance/${eId}/${tId}`).then((r) => r.data)

// Requests
export const getRequests = (params) => api.get('/time-off/requests', { params }).then((r) => r.data)
export const getRequest = (id) => api.get(`/time-off/requests/${id}`).then((r) => r.data)
export const createRequest = (data) => api.post('/time-off/requests', data).then((r) => r.data)
export const approveRequest = (id) => api.post(`/time-off/requests/${id}/approve`).then((r) => r.data)
export const refuseRequest = (id, data) => api.post(`/time-off/requests/${id}/refuse`, data).then((r) => r.data)

// Dashboard
export const getTimeOffDashboard = () => api.get('/time-off/dashboard').then((r) => r.data)

export default {
  getTimeOffTypes,
  getTimeOffType,
  createTimeOffType,
  updateTimeOffType,
  toggleTimeOffType,
  getAllocations,
  getAllocation,
  createAllocation,
  approveAllocation,
  refuseAllocation,
  getBalance,
  getRequests,
  getRequest,
  createRequest,
  approveRequest,
  refuseRequest,
  getTimeOffDashboard,
}

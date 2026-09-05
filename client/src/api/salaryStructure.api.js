import api from './axios'

// ── Structures ──────────────────────────────────────────────
export const getStructures = (params) => api.get('/salary-structures', { params })
export const getStructure = (id) => api.get(`/salary-structures/${id}`)
export const createStructure = (data) => api.post('/salary-structures', data)
export const updateStructure = (id, data) => api.put(`/salary-structures/${id}`, data)
export const toggleStructure = (id) => api.patch(`/salary-structures/${id}/toggle`)
export const previewStructure = (id, data) => api.post(`/salary-structures/${id}/preview`, data)

// ── Rules ───────────────────────────────────────────────────
export const getRules = (params) => api.get('/salary-rules', { params })
export const getRule = (id) => api.get(`/salary-rules/${id}`)
export const createRule = (data) => api.post('/salary-rules', data)
export const updateRule = (id, data) => api.put(`/salary-rules/${id}`, data)
export const deleteRule = (id) => api.delete(`/salary-rules/${id}`)

import api from './axios'

export const getPayruns           = (p)  => api.get('/payruns', { params: p })
export const getPayrun            = (id) => api.get(`/payruns/${id}`)
export const createPayrun         = (d)  => api.post('/payruns', d)
export const computePayrun        = (id) => api.post(`/payruns/${id}/compute`)
export const validatePayrun       = (id) => api.post(`/payruns/${id}/validate`)
export const markPaidPayrun       = (id) => api.post(`/payruns/${id}/mark-paid`)
export const sendPayslips         = (id) => api.post(`/payruns/${id}/send-payslips`)
export const getEligibleEmployees = (p)  => api.get('/payruns/eligible-employees', { params: p })

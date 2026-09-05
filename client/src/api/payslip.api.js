import api from './axios'

export const getPayslips             = (p)  => api.get('/payslips', { params: p })
export const getPayslip              = (id) => api.get(`/payslips/${id}`)
export const createStandalonePayslip = (d)  => api.post('/payslips', d)
export const computePayslip          = (id) => api.post(`/payslips/${id}/compute`)
export const generatePdf             = (id) => api.post(`/payslips/${id}/generate-pdf`)
export const sendPayslip             = (id) => api.post(`/payslips/${id}/send`)
export const markPaidPayslip         = (id) => api.post(`/payslips/${id}/mark-paid`)
export const downloadPayslip         = (id) =>
  api.get(`/payslips/${id}/download`, { responseType: 'blob' })

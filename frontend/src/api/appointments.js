import api from './client';

export const getAppointments = (params) => api.get('/appointments', { params }).then((r) => r.data);
export const getAppointment = (id) => api.get(`/appointments/${id}`).then((r) => r.data.data);
export const getSlots = (date) => api.get('/appointments/slots', { params: { date } }).then((r) => r.data.data);
export const createAppointment = (data) => api.post('/appointments', data).then((r) => r.data.data);
export const updateAppointment = (id, data) => api.put(`/appointments/${id}`, data).then((r) => r.data.data);
export const deleteAppointment = (id) => api.delete(`/appointments/${id}`);

import api from './client';

export const getPatients = (params) => api.get('/patients', { params }).then((r) => r.data);
export const getPatient = (id) => api.get(`/patients/${id}`).then((r) => r.data.data);
export const createPatient = (data) => api.post('/patients', data).then((r) => r.data.data);
export const updatePatient = (id, data) => api.put(`/patients/${id}`, data).then((r) => r.data.data);
export const deletePatient = (id) => api.delete(`/patients/${id}`);

import api from './client';

export const getAutomations = (params) => api.get('/automations', { params }).then((r) => r.data);
export const getAutomation = (id) => api.get(`/automations/${id}`).then((r) => r.data.data);
export const createAutomation = (data) => api.post('/automations', data).then((r) => r.data.data);
export const updateAutomation = (id, data) => api.put(`/automations/${id}`, data).then((r) => r.data.data);
export const deleteAutomation = (id) => api.delete(`/automations/${id}`);
export const getExecutions = (params) => api.get('/automations/executions', { params }).then((r) => r.data);

import api from './client';

export const getConversations = (params) => api.get('/conversations', { params }).then((r) => r.data);
export const getConversation = (id) => api.get(`/conversations/${id}`).then((r) => r.data.data);
export const getMessages = (id, params) => api.get(`/conversations/${id}/messages`, { params }).then((r) => r.data);
export const sendMessage = (id, data) => api.post(`/conversations/${id}/messages`, data).then((r) => r.data.data);
export const escalate = (id) => api.post(`/conversations/${id}/escalate`).then((r) => r.data.data);
export const assume = (id) => api.post(`/conversations/${id}/assume`).then((r) => r.data.data);
export const returnToAI = (id) => api.post(`/conversations/${id}/return-to-ai`).then((r) => r.data.data);
export const deleteConversation = (id) => api.delete(`/conversations/${id}`);

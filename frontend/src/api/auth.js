import api from './client';

export const login = (credentials) => api.post('/auth/login', credentials).then((r) => r.data.data);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me').then((r) => r.data.data);
export const resetPassword = (data) => api.post('/auth/reset-password', data).then((r) => r.data);

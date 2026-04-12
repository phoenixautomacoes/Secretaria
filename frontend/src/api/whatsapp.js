import api from './client';

export const getWhatsAppStatus = () => api.get('/whatsapp/status').then((r) => r.data.data);

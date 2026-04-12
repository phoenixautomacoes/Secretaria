import api from './client';

export const getBoard = () => api.get('/pipeline').then((r) => r.data.data);
export const moveStage = (id, stage) => api.patch(`/pipeline/patients/${id}/stage`, { stage }).then((r) => r.data.data);

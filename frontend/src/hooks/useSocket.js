import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socketInstance = null;

export const useSocket = () => {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    if (!socketInstance) {
      socketInstance = io('/', {
        auth: { token },
        transports: ['websocket'],
      });
    }

    socketRef.current = socketInstance;

    return () => {
      // Não desconecta ao desmontar — mantém conexão global
    };
  }, [token]);

  return socketRef.current;
};

export const getSocket = () => socketInstance;

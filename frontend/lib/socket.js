import { useEffect, useState } from 'react';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export function useSocket(eventHandlers = {}) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    // Dynamically import socket.io-client only on client side
    import('socket.io-client').then(({ io }) => {
      // Create socket connection
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      // Set up event handlers
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        newSocket.on(event, handler);
      });

      setSocket(newSocket);

      return () => {
        // Cleanup on unmount
        Object.keys(eventHandlers).forEach((event) => {
          newSocket.off(event);
        });
        newSocket.disconnect();
      };
    });
  }, []);

  return { socket, connected };
}

// Hook for Socket.IO events
export function useSocketEvents(callback) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!callback) return;

    const handler = (eventData) => {
      callback(eventData);
      setData(eventData);
    };

    return () => {
      // Cleanup handled by useSocket
    };
  }, [callback]);

  return data;
}


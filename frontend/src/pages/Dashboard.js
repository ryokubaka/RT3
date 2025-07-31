import React, { useEffect, useRef } from 'react';

const Dashboard = () => {
  const wsRef = useRef(null);
  const mountedRef = useRef(true);
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [images, setImages] = React.useState([]);

  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current) {
        
        return;
      }

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'image_uploaded') {
            setImages(prevImages => [data.image, ...prevImages]);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        
        setIsConnected(false);
        wsRef.current = null;
        // Only attempt to reconnect if the component is still mounted
        if (mountedRef.current) {
          setTimeout(connectWebSocket, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        setIsConnected(false);
      };
    };

    mountedRef.current = true;
    connectWebSocket();

    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default Dashboard; 
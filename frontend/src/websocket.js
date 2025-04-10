import { createSignal, createEffect, onCleanup } from 'solid-js';

/**
 * WebSocket Client
 * 
 * High-performance WebSocket client with:
 * - Automatic reconnection
 * - Authentication support
 * - Event-based communication
 * - Solid.js signal integration
 */

// WebSocket connection states
const WS_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

export function createWebSocketClient(baseUrl = 'ws://localhost:8080/ws') {
  // Connection state signals
  const [isConnected, setIsConnected] = createSignal(false);
  const [isConnecting, setIsConnecting] = createSignal(false);
  const [connectionError, setConnectionError] = createSignal(null);
  
  // Message signals
  const [lastMessage, setLastMessage] = createSignal(null);
  
  // Internal state
  let socket = null;
  let reconnectAttempts = 0;
  let maxReconnectAttempts = 10;
  let reconnectTimeoutId = null;
  let token = null;
  const eventHandlers = new Map();
  
  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = () => {
    return Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000); // Max 30 seconds
  };
  
  // Connect to WebSocket
  const connect = (authToken) => {
    if (authToken) {
      token = authToken;
    }
    
    if (!token) {
      setConnectionError('Authentication token is required');
      return false;
    }
    
    // Don't try to connect if already connecting or connected
    if (socket && (socket.readyState === WS_STATES.CONNECTING || socket.readyState === WS_STATES.OPEN)) {
      return true;
    }
    
    // Clear any pending reconnect attempts
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }
    
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      // Create new WebSocket connection with authentication token
      const url = `${baseUrl}/updates?token=${token}`;
      socket = new WebSocket(url);
      
      // Set up event handlers
      socket.onopen = handleOpen;
      socket.onclose = handleClose;
      socket.onerror = handleError;
      socket.onmessage = handleMessage;
      
      return true;
    } catch (error) {
      setConnectionError(`Connection error: ${error.message}`);
      setIsConnecting(false);
      scheduleReconnect();
      return false;
    }
  };
  
  // Handle successful connection
  const handleOpen = () => {
    setIsConnected(true);
    setIsConnecting(false);
    setConnectionError(null);
    reconnectAttempts = 0;
    
    // Trigger connected event
    triggerEvent('connected', { timestamp: new Date().toISOString() });
  };
  
  // Handle connection close
  const handleClose = (event) => {
    setIsConnected(false);
    setIsConnecting(false);
    
    // Check if the close was due to authentication failure
    if (event.code === 1008) {
      setConnectionError('Authentication failed. Please log in again.');
      triggerEvent('authError', { code: event.code, reason: event.reason });
    } else {
      setConnectionError(`Connection closed (${event.code}): ${event.reason}`);
      scheduleReconnect();
    }
    
    // Trigger disconnected event
    triggerEvent('disconnected', { code: event.code, reason: event.reason });
  };
  
  // Handle connection error
  const handleError = (error) => {
    setConnectionError(`WebSocket error: ${error.message || 'Unknown error'}`);
    triggerEvent('error', { error });
  };
  
  // Handle incoming message
  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      setLastMessage(message);
      
      // Trigger message-specific event
      if (message.type) {
        triggerEvent(message.type.toLowerCase(), message);
      }
      
      // Trigger generic message event
      triggerEvent('message', message);
    } catch (error) {
      setConnectionError(`Failed to parse message: ${error.message}`);
    }
  };
  
  // Schedule reconnection attempt
  const scheduleReconnect = () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      setConnectionError('Maximum reconnection attempts reached');
      triggerEvent('maxReconnectAttemptsReached', { attempts: reconnectAttempts });
      return;
    }
    
    reconnectAttempts++;
    const delay = getReconnectDelay();
    
    // Trigger reconnecting event
    triggerEvent('reconnecting', { attempt: reconnectAttempts, delay });
    
    reconnectTimeoutId = setTimeout(() => {
      connect();
    }, delay);
  };
  
  // Send message to the server
  const send = (type, data = {}) => {
    if (!socket || socket.readyState !== WS_STATES.OPEN) {
      return false;
    }
    
    try {
      const message = JSON.stringify({
        type,
        ...data,
        timestamp: new Date().toISOString(),
      });
      
      socket.send(message);
      return true;
    } catch (error) {
      setConnectionError(`Failed to send message: ${error.message}`);
      return false;
    }
  };
  
  // Disconnect WebSocket
  const disconnect = () => {
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }
    
    if (socket) {
      // Remove event handlers to prevent reconnection
      socket.onclose = null;
      socket.onerror = null;
      
      if (socket.readyState === WS_STATES.OPEN || socket.readyState === WS_STATES.CONNECTING) {
        socket.close(1000, 'User disconnected');
      }
      
      socket = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    triggerEvent('disconnected', { code: 1000, reason: 'User disconnected' });
  };
  
  // Subscribe to events
  const on = (eventName, handler) => {
    if (!eventHandlers.has(eventName)) {
      eventHandlers.set(eventName, new Set());
    }
    
    eventHandlers.get(eventName).add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = eventHandlers.get(eventName);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlers.delete(eventName);
        }
      }
    };
  };
  
  // Trigger event handlers
  const triggerEvent = (eventName, data) => {
    const handlers = eventHandlers.get(eventName);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${eventName} handler:`, error);
        }
      }
    }
  };
  
  // Ping to keep connection alive
  const startHeartbeat = () => {
    const pingInterval = setInterval(() => {
      if (isConnected()) {
        send('PING');
      }
    }, 30000); // Send ping every 30 seconds
    
    // Cleanup on component unmount
    onCleanup(() => {
      clearInterval(pingInterval);
      disconnect();
    });
  };
  
  // Start heartbeat when connected
  createEffect(() => {
    if (isConnected()) {
      startHeartbeat();
    }
  });
  
  // Set up task subscription helpers
  const subscribeToTasks = () => {
    return send('SUBSCRIBE_TASKS');
  };
  
  const unsubscribeFromTasks = () => {
    return send('UNSUBSCRIBE_TASKS');
  };
  
  // Return public API
  return {
    // State signals
    isConnected,
    isConnecting,
    connectionError,
    lastMessage,
    
    // Methods
    connect,
    disconnect,
    send,
    on,
    
    // Helper methods for task subscriptions
    subscribeToTasks,
    unsubscribeFromTasks,
  };
}

// Export singleton instance for app-wide use
let websocketClient;

export const getWebSocketClient = (baseUrl) => {
  if (!websocketClient) {
    websocketClient = createWebSocketClient(baseUrl);
  }
  return websocketClient;
}; 
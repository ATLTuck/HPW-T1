import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { NavLink, useLocation } from 'solid-app-router';

/**
 * Header Component
 * 
 * Displays application navigation and connection status.
 * Optimized with reactive patterns for minimal re-renders.
 * 
 * @param {Object} props - Component props
 * @param {Object|null} props.user - Current user data or null if not logged in
 * @param {Function} props.onLogout - Logout callback function
 * @param {Object} props.websocket - WebSocket client instance
 */
export default function Header(props) {
  const location = useLocation();
  
  // Connection status tracking
  const [connectionStatus, setConnectionStatus] = createSignal('disconnected');
  
  // Set up WebSocket status monitoring
  createEffect(() => {
    if (!props.websocket) return;
    
    // Update connection status when it changes
    const handleConnected = () => setConnectionStatus('connected');
    const handleDisconnected = () => setConnectionStatus('disconnected');
    const handleConnecting = () => setConnectionStatus('connecting');
    
    // Subscribe to WebSocket connection events
    const unsubscribeConnected = props.websocket.on('connected', handleConnected);
    const unsubscribeDisconnected = props.websocket.on('disconnected', handleDisconnected);
    const unsubscribeReconnecting = props.websocket.on('reconnecting', handleConnecting);
    
    // Set initial status
    if (props.websocket.isConnected()) {
      setConnectionStatus('connected');
    } else if (props.websocket.isConnecting()) {
      setConnectionStatus('connecting');
    } else {
      setConnectionStatus('disconnected');
    }
    
    // Clean up subscriptions when component unmounts
    onCleanup(() => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeReconnecting();
    });
  });
  
  // Get status text and class based on connection status
  const getStatusClass = () => {
    const status = connectionStatus();
    return `connection-status ${status}`;
  };
  
  const getStatusText = () => {
    const status = connectionStatus();
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };
  
  return (
    <header class="app-header">
      <div class="container">
        <div class="header-content">
          <div class="logo">
            <NavLink href="/" class="logo-link">
              <h1>TaskManager</h1>
            </NavLink>
          </div>
          
          <nav class="main-nav">
            <Show when={props.user} fallback={
              <div class="nav-links">
                <NavLink href="/login" class="nav-link" activeClass="active">
                  Login
                </NavLink>
                <NavLink href="/register" class="nav-link" activeClass="active">
                  Register
                </NavLink>
              </div>
            }>
              <div class="nav-links">
                <NavLink href="/dashboard" class="nav-link" activeClass="active">
                  Dashboard
                </NavLink>
                <NavLink href="/profile" class="nav-link" activeClass="active">
                  Profile
                </NavLink>
                
                <Show when={props.user}>
                  <div class="user-menu">
                    <span class="user-name">{props.user.name || props.user.email}</span>
                    <button 
                      class="btn btn-secondary logout-btn" 
                      onClick={props.onLogout}
                    >
                      Logout
                    </button>
                  </div>
                </Show>
              </div>
            </Show>
          </nav>
        </div>
        
        <Show when={props.user}>
          <div class="connection-info">
            <span class={getStatusClass()}>
              {getStatusText()}
            </span>
          </div>
        </Show>
      </div>
    </header>
  );
} 
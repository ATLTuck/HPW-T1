import { lazy, createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { Routes, Route, useNavigate, Navigate } from 'solid-app-router';
import { getWebSocketClient } from './websocket';

// Lazy-loaded route components for code splitting
const Home = lazy(() => import('./routes/Home'));
const Login = lazy(() => import('./routes/Login'));
const Register = lazy(() => import('./routes/Register'));
const Dashboard = lazy(() => import('./routes/Dashboard'));
const TaskForm = lazy(() => import('./routes/TaskForm'));
const Profile = lazy(() => import('./routes/Profile'));
const NotFound = lazy(() => import('./routes/NotFound'));

// Header component
import Header from './components/Header';

/**
 * Main App component
 * 
 * Handles routing, authentication state, and WebSocket connection.
 * Uses lazy loading for performance optimization.
 */
function App() {
  // Authentication state
  const [user, setUser] = createSignal(null);
  const [isAuthChecked, setIsAuthChecked] = createSignal(false);
  
  // WebSocket connection
  const ws = getWebSocketClient();
  
  // Navigation helper
  const navigate = useNavigate();
  
  // Check authentication on startup
  createEffect(() => {
    // Try to get stored token and user data
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        // Parse stored user data
        const userData = JSON.parse(storedUser);
        setUser(userData);
        
        // Connect WebSocket with token
        ws.connect(token);
      } catch (error) {
        console.error('Failed to parse stored user data', error);
        logout();
      }
    }
    
    setIsAuthChecked(true);
  });
  
  // Handle login
  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Connect WebSocket with new token
    ws.connect(token);
    
    navigate('/dashboard');
  };
  
  // Handle logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Disconnect WebSocket
    ws.disconnect();
    
    navigate('/login');
  };
  
  // Handle authentication errors from WebSocket
  createEffect(() => {
    const unsubscribe = ws.on('authError', () => {
      // Token is invalid or expired, log out
      logout();
    });
    
    onCleanup(() => unsubscribe());
  });
  
  // Protected route component
  const ProtectedRoute = (props) => {
    const currentUser = user();
    
    if (!isAuthChecked()) {
      return <div class="loading"></div>;
    }
    
    if (!currentUser) {
      return <Navigate href="/login" />;
    }
    
    return props.children;
  };
  
  return (
    <div class="app">
      <Header user={user()} onLogout={logout} websocket={ws} />
      
      <main>
        <Show when={isAuthChecked()}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login onLogin={login} />} />
            <Route path="/register" element={<Register onRegister={login} />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard user={user()} websocket={ws} />
              </ProtectedRoute>
            } />
            <Route path="/tasks/new" element={
              <ProtectedRoute>
                <TaskForm />
              </ProtectedRoute>
            } />
            <Route path="/tasks/:id/edit" element={
              <ProtectedRoute>
                <TaskForm />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile user={user()} setUser={setUser} />
              </ProtectedRoute>
            } />
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Show>
      </main>
    </div>
  );
}

export default App; 
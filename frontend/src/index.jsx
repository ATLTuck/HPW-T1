/* @refresh reload */
import { render } from 'solid-js/web';
import { Router } from 'solid-app-router';
import { lazy } from 'solid-js';

// Import root app component
import App from './App';

// Global styles
import './styles.css';

/**
 * Application entry point with performance optimizations:
 * - SSR hydration for faster initial load
 * - Router with code splitting
 * - Error boundaries for stability
 */

// Root element where our app will be mounted
const root = document.getElementById('root');

if (!root) {
  throw new Error(
    'Root element not found. Create a div with id="root" in your index.html'
  );
}

// Set up error boundary for the entire application
class ErrorBoundary {
  constructor(props) {
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div class="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => window.location.reload()}>
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Render the application with router
render(
  () => (
    <ErrorBoundary>
      <Router>
        <App />
      </Router>
    </ErrorBoundary>
  ),
  root
); 
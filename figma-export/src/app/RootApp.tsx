import { useEffect, useState } from 'react';
import App from './App';
import AdminApp from './AdminApp';

/**
 * Root Application Router
 * Determines whether to load the admin panel or main application
 */
export default function RootApp() {
  const [isAdminRoute, setIsAdminRoute] = useState(false);

  useEffect(() => {
    // Check if current path starts with /admin
    const checkRoute = () => {
      setIsAdminRoute(window.location.pathname.startsWith('/admin'));
    };

    checkRoute();

    // Listen for navigation changes
    window.addEventListener('popstate', checkRoute);
    
    // Intercept pushState and replaceState
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      checkRoute();
    };
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      checkRoute();
    };

    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  // Render admin or main app based on route
  return isAdminRoute ? <AdminApp /> : <App />;
}

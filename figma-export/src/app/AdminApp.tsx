import { RouterProvider } from 'react-router';
import { createAdminRouter } from './admin-routes';

/**
 * Admin Application Entry Point
 * 
 * To access the admin panel, navigate to:
 * http://localhost:5173/admin/login
 * 
 * Or add a link from the main app to /admin
 */
export default function AdminApp() {
  const router = createAdminRouter();
  
  return <RouterProvider router={router} />;
}

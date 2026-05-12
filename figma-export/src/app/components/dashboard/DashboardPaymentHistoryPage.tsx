import { useLocation, useNavigate } from 'react-router';
import { PaymentHistory } from '../PaymentHistory';

export function DashboardPaymentHistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const backPath = location.pathname.startsWith('/label-dashboard')
    ? '/label-dashboard/earnings'
    : '/dashboard/earnings';

  return <PaymentHistory onBack={() => navigate(backPath)} />;
}
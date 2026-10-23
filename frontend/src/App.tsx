import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import CreateSalesOrderPage from './pages/CreateSalesOrderPage';
import LoginPage from './pages/LoginPage';
import SalesOrderDetailsPage from './pages/SalesOrderDetailsPage';
import SalesOrderListPage from './pages/SalesOrderListPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/orders" replace />} />
        <Route path="/orders" element={<AppLayout><SalesOrderListPage /></AppLayout>} />
        <Route path="/orders/new" element={<AppLayout><CreateSalesOrderPage /></AppLayout>} />
        <Route path="/orders/:id" element={<AppLayout><SalesOrderDetailsPage /></AppLayout>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

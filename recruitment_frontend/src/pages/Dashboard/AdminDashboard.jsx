import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateDashboard from './PrivateDashboard';
import AdvancedDashboard from './AdvancedDashboard';

const AdminDashboard = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="private" replace />} />
      <Route path="private" element={<PrivateDashboard />} />
      <Route path="advanced" element={<AdvancedDashboard />} />
      <Route path="*" element={<Navigate to="private" replace />} />
    </Routes>
  );
};

export default AdminDashboard;

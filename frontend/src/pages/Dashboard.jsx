import { useAuth } from '../context/AuthContext';
import AdminDashboard from './dashboard/AdminDashboard';
import StudentDashboard from './dashboard/StudentDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <AdminDashboard /> : <StudentDashboard />;
};

export default Dashboard;

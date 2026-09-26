import { useAuth } from '../context/AuthContext';
import MessAdmin from './mess/MessAdmin';
import MessStudent from './mess/MessStudent';

// Menu, announcements and meal counts now come from the backend instead of
// each browser's localStorage, so everyone sees the same data.
const Mess = () => {
  const { user } = useAuth();
  return user?.role === 'STUDENT' ? <MessStudent /> : <MessAdmin />;
};

export default Mess;

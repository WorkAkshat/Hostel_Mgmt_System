import { useAuth } from '../context/AuthContext';
import ComplaintBoard from './helpdesk/ComplaintBoard';
import StudentComplaints from './helpdesk/StudentComplaints';

// Students raise and track complaints; wardens work through the queue.
const Complaints = () => {
  const { user } = useAuth();
  return user?.role === 'STUDENT' ? <StudentComplaints /> : <ComplaintBoard />;
};

export default Complaints;

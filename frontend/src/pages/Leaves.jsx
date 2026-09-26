import { useAuth } from '../context/AuthContext';
import LeaveBoard from './leaves/LeaveBoard';
import StudentLeaves from './leaves/StudentLeaves';

// Students apply and track; wardens approve; gate staff log exits and returns.
const Leaves = () => {
  const { user } = useAuth();
  return user?.role === 'STUDENT' ? <StudentLeaves /> : <LeaveBoard />;
};

export default Leaves;

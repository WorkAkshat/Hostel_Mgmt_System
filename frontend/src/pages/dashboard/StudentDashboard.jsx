import { useEffect, useState } from 'react';
import { Wrench, Receipt, CalendarDays, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboard as dashboardApi } from '../../utils/api';

// Student home — still the previous layout, restyled via theme tokens.
// Will be rebuilt after the admin pages.
const StudentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const dashData = await dashboardApi.getDashboard();
        setStats({
          studentProfile: dashData.profile,
          activeComplaint: dashData.stats.pendingComplaints,
          outstandingFees: dashData.stats.totalDue,
          activeLeaves: dashData.stats.pendingLeaves,
          checkedInToday: dashData.messAttendance.filter(d => d.date === new Date().toISOString().split('T')[0]).length,
        });
      } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="spinner"></div>
        <p className="text-slate-400 font-medium text-sm">Loading dashboard...</p>
      </div>
    );
  }

  const {
    studentProfile = null,
    activeComplaint = 0,
    outstandingFees = 0,
    activeLeaves = 0,
    checkedInToday = 0
  } = stats || {};
  const allocatedRoom = studentProfile?.room;

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      {/* Student Profile Hero Card */}
      <div className="bg-brand-600 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-12 -right-4 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center font-bold text-3xl text-white shadow-inner shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">{user.name}</h2>
              <span className="inline-flex items-center bg-white/15 border border-white/25 text-white/90 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Student
              </span>
            </div>
            {studentProfile?.enrollmentNumber && (
              <p className="text-white/70 text-sm font-medium">{studentProfile.enrollmentNumber}</p>
            )}
            <p className="text-white/60 text-xs font-medium truncate">{user.email}</p>
          </div>

          {allocatedRoom && (
            <div className="sm:ml-auto shrink-0 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-center sm:text-right">
              <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">Room</p>
              <p className="text-lg font-extrabold text-white leading-tight">{allocatedRoom.roomNumber}</p>
              <p className="text-[11px] text-white/70 font-medium">{allocatedRoom.block} Block • {allocatedRoom.sharingType}-sharing</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex flex-col gap-1 text-left">
          <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 mb-1">
            <Wrench size={15} />
          </div>
          <span className="text-2xl font-extrabold text-slate-800 leading-none">{activeComplaint}</span>
          <span className="text-[11px] text-slate-400 font-semibold">Open Complaints</span>
        </div>
        <div className="glass-card p-4 flex flex-col gap-1 text-left">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 mb-1">
            <Receipt size={15} />
          </div>
          <span className="text-2xl font-extrabold text-slate-800 leading-none">
            {outstandingFees > 0 ? `₹${outstandingFees.toLocaleString()}` : '₹0'}
          </span>
          <span className="text-[11px] text-slate-400 font-semibold">Outstanding Fees</span>
        </div>
        <div className="glass-card p-4 flex flex-col gap-1 text-left">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 mb-1">
            <CalendarDays size={15} />
          </div>
          <span className="text-2xl font-extrabold text-slate-800 leading-none">{activeLeaves}</span>
          <span className="text-[11px] text-slate-400 font-semibold">Active Leaves</span>
        </div>
        <div className="glass-card p-4 flex flex-col gap-1 text-left">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 mb-1">
            <UtensilsCrossed size={15} />
          </div>
          <span className="text-2xl font-extrabold text-slate-800 leading-none">{checkedInToday}</span>
          <span className="text-[11px] text-slate-400 font-semibold">Meals Today</span>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

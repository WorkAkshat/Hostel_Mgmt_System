import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Users, Home, Wrench, ShieldAlert, Receipt, Sparkles, 
  CheckCircle, Clock, CalendarDays, UtensilsCrossed, Megaphone, Phone, ArrowRight, ShieldCheck, HelpCircle, ChevronRight
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import CustomModal from '../components/CustomModal';

const COLORS = ['#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [guestForm, setGuestForm] = useState({ name: '', relationship: 'Father', phone: '', date: '' });
  const [guestSubmitted, setGuestSubmitted] = useState(false);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        if (user.role === 'ADMIN') {
          // Fetch aggregate data, including mess biometric stats
          const [rooms, students, complaints, invoices, visitors, messStats] = await Promise.all([
            api('/rooms'),
            api('/students'),
            api('/complaints'),
            api('/invoices'),
            api('/visitors'),
            api('/mess/stats')
          ]);

          // Compute analytics
          const totalBeds = rooms.reduce((acc, r) => acc + r.sharingType, 0);
          const occupiedBeds = students.filter(s => s.roomId !== null).length;
          const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
          
          const pendingComplaints = complaints.filter(c => c.status !== 'RESOLVED').length;
          const activeVisitors = visitors.filter(v => v.checkOutTime === null).length;
          
          const unpaidInvoicesAmount = invoices
            .filter(i => i.status === 'UNPAID')
            .reduce((acc, i) => acc + i.amount, 0);

          // Format chart data
          const roomBlockData = rooms.reduce((acc, r) => {
            const block = r.block;
            if (!acc[block]) acc[block] = { name: block, rooms: 0, occupied: 0 };
            acc[block].rooms += 1;
            acc[block].occupied += r.students.length;
            return acc;
          }, {});
          
          const complaintStatusCounts = complaints.reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1;
            return acc;
          }, { PENDING: 0, IN_PROGRESS: 0, RESOLVED: 0 });

          const complaintChartData = Object.keys(complaintStatusCounts).map(key => ({
            name: key,
            value: complaintStatusCounts[key]
          }));

          setStats({
            summary: {
              occupancyRate,
              occupiedBeds,
              totalBeds,
              pendingComplaints,
              activeVisitors,
              unpaidInvoicesAmount
            },
            charts: {
              roomBlockData: Object.values(roomBlockData),
              complaintChartData,
              mealStatsChartData: messStats.mealStatsChartData,
              historyChartData: messStats.historyChartData
            },
            recentComplaints: complaints.slice(0, 5),
            recentVisitors: visitors.slice(0, 5)
          });
        } else {
          // Fetch student specific data
          const studentId = user.studentDetails?.id;
          if (studentId) {
            const [studentProfile, complaints, leaves, invoices, diningLogs] = await Promise.all([
              api(`/students/${studentId}`),
              api('/complaints/my-complaints'),
              api('/leaves/my-leaves'),
              api('/invoices/my-invoices'),
              api('/mess/my-attendance')
            ]);

            const activeComplaint = complaints.filter(c => c.status !== 'RESOLVED').length;
            const outstandingFees = invoices
              .filter(i => i.status === 'UNPAID')
              .reduce((acc, i) => acc + i.amount, 0);

            const activeLeaves = leaves.filter(l => ['PENDING', 'APPROVED', 'CHECKED_OUT'].includes(l.status)).length;
            
            // Check if ate today
            const todayStr = new Date().toISOString().split('T')[0];
            const checkedInToday = diningLogs.filter(d => d.date === todayStr).length;

            setStats({
              studentProfile,
              activeComplaint,
              outstandingFees,
              activeLeaves,
              checkedInToday,
              recentComplaints: complaints.slice(0, 3),
              recentInvoices: invoices.slice(0, 3),
              recentLeaves: leaves.slice(0, 3)
            });
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
      } finally {
        setStats(prev => prev); // refresh state
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [user]);

  if (loading) {
    return (
      <div style={styles.loadingWrapper}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading GHMS dashboard statistics...</p>
      </div>
    );
  }

  // WARDEN DASHBOARD VIEW
  if (user.role === 'ADMIN') {
    const { summary, charts, recentComplaints, recentVisitors } = stats || {};
    
    return (
      <div className="animate-fade-in">
        <h1 className="page-title">Girls Hostel Warden Dashboard</h1>
        <p className="page-subtitle">Girls Hostel Management System (GHMS) biometric logs, occupancy, and bill ledgers.</p>

        {/* Quick Admin Actions Grid (Mobile Only) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 lg:hidden">
          <button onClick={() => navigate('/admin/students')} className="flex flex-col items-center justify-center p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-center gap-2 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-all">
            <Users size={22} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">Students Directory</span>
          </button>
          <button onClick={() => navigate('/admin/rooms')} className="flex flex-col items-center justify-center p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-center gap-2 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-all">
            <Home size={22} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">Rooms & Inventory</span>
          </button>
          <button onClick={() => navigate('/admin/leaves')} className="flex flex-col items-center justify-center p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-center gap-2 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-all">
            <CalendarDays size={22} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">Leave Passes</span>
          </button>
          <button onClick={() => navigate('/admin/mess')} className="flex flex-col items-center justify-center p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-center gap-2 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-all">
            <Sparkles size={22} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">Mess Menu</span>
          </button>
          <button onClick={() => navigate('/admin/fees')} className="flex flex-col items-center justify-center p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-center gap-2 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-all">
            <Receipt size={22} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">Fees Ledger</span>
          </button>
          <button onClick={() => navigate('/admin/complaints')} className="flex flex-col items-center justify-center p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-center gap-2 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-all">
            <Wrench size={22} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">Complaints Queue</span>
          </button>
          <button onClick={() => navigate('/admin/visitors')} className="flex flex-col items-center justify-center p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-center gap-2 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-all">
            <Users size={22} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">Visitor Registry</span>
          </button>
          <button onClick={() => navigate('/admin/staff')} className="flex flex-col items-center justify-center p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-center gap-2 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-all">
            <Users size={22} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">Staff Roster</span>
          </button>
        </div>

        {/* Warden Stats Grid */}
        <div style={styles.statsGrid}>
          <MetricCard 
            title="Room Occupancy" 
            value={`${summary?.occupiedBeds}/${summary?.totalBeds} Beds`}
            subtitle={`${summary?.occupancyRate}% Occupancy Rate`}
            icon={<Home size={22} />}
            color="var(--accent)"
          />
          <MetricCard 
            title="Pending Maintenance" 
            value={summary?.pendingComplaints}
            subtitle="Pending repairs inspection"
            icon={<Wrench size={22} />}
            color="var(--warning)"
          />
          <MetricCard 
            title="Total Revenue Dues" 
            value={`₹${summary?.unpaidInvoicesAmount?.toLocaleString()}`}
            subtitle="Outstanding invoices"
            icon={<Receipt size={22} />}
            color="var(--danger)"
          />
          <MetricCard 
            title="Active Visitors" 
            value={summary?.activeVisitors}
            subtitle="Logged guest check-ins"
            icon={<Users size={22} />}
            color="var(--success)"
          />
        </div>

        {/* Charts Row */}
        <div style={styles.chartsGrid}>
          {/* Biometric Mess dining statistics */}
          <div className="glass-card" style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <UtensilsCrossed size={18} color="var(--accent)" />
              <h3 style={styles.chartTitle}>Today's Dining Biometric Turnout</h3>
            </div>
            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts?.mealStatsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip contentStyle={styles.chartTooltip} />
                  <Legend />
                  <Bar dataKey="Attended" name="Ate (Biometric Verified)" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Capacity" name="Total Roster" fill="rgba(0, 0, 0, 0.04)" stroke="var(--border-color)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Room Block Occupancy */}
          <div className="glass-card" style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Occupancy by Hostel Block</h3>
            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts?.roomBlockData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip contentStyle={styles.chartTooltip} />
                  <Legend />
                  <Bar dataKey="occupied" name="Occupied Beds" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rooms" name="Total Rooms" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div style={styles.chartsGrid}>
          {/* Complaints Pie Chart */}
          <div className="glass-card" style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Helpdesk Tickets Distribution</h3>
            <div style={styles.chartContainerFlex}>
              <ResponsiveContainer width="60%" height={260}>
                <PieChart>
                  <Pie
                    data={charts?.complaintChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {charts?.complaintChartData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={styles.chartTooltip} />
                </PieChart>
              </ResponsiveContainer>
              <div style={styles.legendContainer}>
                {charts?.complaintChartData?.map((entry, index) => (
                  <div key={entry.name} style={styles.legendItem}>
                    <span style={{...styles.legendColor, background: COLORS[index % COLORS.length]}}></span>
                    <span style={styles.legendText}>{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity Log */}
          <div className="glass-card" style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Active Maintenance tickets</h3>
            <div style={styles.activityList}>
              {recentComplaints?.length === 0 ? (
                <p style={styles.emptyText}>No recent maintenance tickets.</p>
              ) : (
                recentComplaints?.map(complaint => (
                  <div key={complaint.id} style={styles.activityItem}>
                    <div style={styles.activityIcon}>
                      <Wrench size={16} color="var(--warning)" />
                    </div>
                    <div style={styles.activityMeta}>
                      <p style={styles.activityTitle}>{complaint.category} Issue - Room {complaint.student?.room?.roomNumber || 'N/A'}</p>
                      <p style={styles.activityDesc}>{complaint.description}</p>
                    </div>
                    <span className={`badge ${complaint.status === 'RESOLVED' ? 'badge-success' : 'badge-warning'}`}>
                      {complaint.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STUDENT PORTAL VIEW
  const { 
    studentProfile = null, 
    activeComplaint = 0, 
    outstandingFees = 0, 
    activeLeaves = 0, 
    checkedInToday = 0, 
    recentComplaints = [], 
    recentInvoices = [], 
    recentLeaves = [] 
  } = stats || {};
  const allocatedRoom = studentProfile?.room;

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    setGuestSubmitted(true);
    setTimeout(() => {
      setGuestSubmitted(false);
      setShowGuestModal(false);
      setGuestForm({ name: '', relationship: 'Father', phone: '', date: '' });
      alert('Guest pre-registered successfully!');
    }, 1000);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Latest Announcement Banner */}
      <div 
        onClick={() => setShowAnnouncementModal(true)}
        className="bg-[#0b1a52] text-white rounded-2xl p-6 relative overflow-hidden shadow-lg cursor-pointer hover:scale-[1.01] transition-all duration-200"
      >
        <div className="absolute right-0 top-0 bottom-0 opacity-15 pointer-events-none flex items-center pr-8">
          <Megaphone size={120} />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
            Latest Announcement
          </span>
          <span className="text-white/60 text-xs">Oct 24, 2024</span>
        </div>
        <h2 className="text-lg font-bold">Annual Sports Meet 2024</h2>
        <p className="text-white/80 text-xs mt-1">Registrations are open until this Friday. Visit the Notice Board for details.</p>
        <div className="flex items-center gap-1 mt-4 text-xs font-semibold text-blue-400 hover:text-blue-300">
          <span>Read notice</span>
          <ArrowRight size={14} />
        </div>
      </div>

      {/* Grid of Navigation Action Cards */}
      <div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div 
            onClick={() => navigate('/student/leaves')}
            className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md hover:border-blue-500/30 transition-all duration-200 min-h-[110px] sm:min-h-[140px]"
          >
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#0b1a52] text-white flex items-center justify-center mb-2.5 shadow-md">
              <CalendarDays size={20} className="sm:w-[26px] sm:h-[26px]" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold leading-tight text-[#0b1a52]">Apply Leave</span>
          </div>

          <div 
            onClick={() => navigate('/student/complaints')}
            className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md hover:border-blue-500/30 transition-all duration-200 min-h-[110px] sm:min-h-[140px]"
          >
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#0b1a52] text-white flex items-center justify-center mb-2.5 shadow-md">
              <Wrench size={20} className="sm:w-[26px] sm:h-[26px]" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold leading-tight text-[#0b1a52]">Raise Complaint</span>
          </div>

          <div 
            onClick={() => setShowGuestModal(true)}
            className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md hover:border-blue-500/30 transition-all duration-200 min-h-[110px] sm:min-h-[140px]"
          >
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#0b1a52] text-white flex items-center justify-center mb-2.5 shadow-md">
              <Users size={20} className="sm:w-[26px] sm:h-[26px]" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold leading-tight text-[#0b1a52]">Guest Form</span>
          </div>

          <div 
            onClick={() => setShowAttendanceModal(true)}
            className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md hover:border-blue-500/30 transition-all duration-200 min-h-[110px] sm:min-h-[140px]"
          >
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#0b1a52] text-white flex items-center justify-center mb-2.5 shadow-md">
              <CheckCircle size={20} className="sm:w-[26px] sm:h-[26px]" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold leading-tight text-[#0b1a52]">Attendance</span>
          </div>

          <div 
            onClick={() => setShowAnnouncementModal(true)}
            className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md hover:border-blue-500/30 transition-all duration-200 min-h-[110px] sm:min-h-[140px]"
          >
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#0b1a52] text-white flex items-center justify-center mb-2.5 shadow-md">
              <Megaphone size={20} className="sm:w-[26px] sm:h-[26px]" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold leading-tight text-[#0b1a52]">Notice Board</span>
          </div>

          <div 
            onClick={() => setShowContactModal(true)}
            className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md hover:border-blue-500/30 transition-all duration-200 min-h-[110px] sm:min-h-[140px]"
          >
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#0b1a52] text-white flex items-center justify-center mb-2.5 shadow-md">
              <Phone size={20} className="sm:w-[26px] sm:h-[26px]" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold leading-tight text-[#0b1a52]">Phone Directory</span>
          </div>
        </div>
      </div>

      {/* Upcoming Events Section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-[#0b1a52] mb-4">Upcoming Events</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-gray-100 text-gray-500 font-bold shrink-0">
              <span className="text-[10px] uppercase leading-none">OCT</span>
              <span className="text-lg leading-none mt-1">24</span>
            </div>
            <div className="flex-grow">
              <h4 className="text-sm font-bold text-[#0b1a52]">Warden Interactive Session</h4>
              <p className="text-xs text-gray-500 mt-0.5">4:00 PM • Common Room</p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </div>

          <div className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-gray-100 text-gray-500 font-bold shrink-0">
              <span className="text-[10px] uppercase leading-none">OCT</span>
              <span className="text-lg leading-none mt-1">29</span>
            </div>
            <div className="flex-grow">
              <h4 className="text-sm font-bold text-[#0b1a52]">Hostel Night & Community Dinner</h4>
              <p className="text-xs text-gray-500 mt-0.5">8:00 PM • Central Lawn</p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
        </div>
      </div>

      {/* Guest Pre-registration Form Modal */}
      <CustomModal isOpen={showGuestModal} onClose={() => setShowGuestModal(false)} title="Guest Pre-Registration Form">
        <form onSubmit={handleGuestSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Guest Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              required 
              placeholder="e.g. Rakesh Kumar"
              value={guestForm.name}
              onChange={(e) => setGuestForm({...guestForm, name: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Relationship</label>
            <select 
              className="form-input"
              value={guestForm.relationship}
              onChange={(e) => setGuestForm({...guestForm, relationship: e.target.value})}
            >
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Brother">Brother</option>
              <option value="Sister">Sister</option>
              <option value="Guardian">Guardian</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Contact Number</label>
            <input 
              type="text" 
              className="form-input" 
              required 
              placeholder="+91 XXXXX XXXXX"
              value={guestForm.phone}
              onChange={(e) => setGuestForm({...guestForm, phone: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Visit</label>
            <input 
              type="date" 
              className="form-input" 
              required 
              value={guestForm.date}
              onChange={(e) => setGuestForm({...guestForm, date: e.target.value})}
            />
          </div>
          <div className="flex gap-3 justify-end pt-3">
            <button type="button" className="btn-secondary" onClick={() => setShowGuestModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Register Guest</button>
          </div>
        </form>
      </CustomModal>

      {/* Attendance History Modal */}
      <CustomModal isOpen={showAttendanceModal} onClose={() => setShowAttendanceModal(false)} title="My Roster Attendance">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-900">Today's Dining Count:</span>
            <span className="text-xs font-bold text-blue-900 bg-white px-2 py-0.5 rounded shadow-sm">{checkedInToday} / 4 Meals Eaten</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0b1a52] uppercase tracking-wider mb-2">Simulated Biometric Check-ins</h4>
            <div className="border border-gray-150 rounded-xl divide-y divide-gray-100 overflow-hidden bg-white max-h-[300px] overflow-y-auto">
              <div className="p-3 flex justify-between items-center text-xs">
                <span className="font-semibold">Dinner</span>
                <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">Verified</span>
              </div>
              <div className="p-3 flex justify-between items-center text-xs">
                <span className="font-semibold">Snacks</span>
                <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">Verified</span>
              </div>
              <div className="p-3 flex justify-between items-center text-xs">
                <span className="font-semibold">Lunch</span>
                <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">Verified</span>
              </div>
              <div className="p-3 flex justify-between items-center text-xs">
                <span className="font-semibold">Breakfast</span>
                <span className="text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100">Missed</span>
              </div>
            </div>
          </div>
        </div>
      </CustomModal>

      {/* Emergency Directory Modal */}
      <CustomModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} title="Emergency Directory">
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)]">Immediate hotlines for security and resident assistance.</p>
          <div className="space-y-3">
            <div className="p-3 bg-black/2 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Dr. Shalini Sharma</h4>
                <p className="text-xs text-[var(--text-tertiary)]">Chief Hostel Warden</p>
              </div>
              <a href="tel:+919876543210" className="btn-primary py-1.5 px-3 text-xs gap-1.5">
                <Phone size={12} />
                <span>Call Warden</span>
              </a>
            </div>

            <div className="p-3 bg-black/2 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Main Security Gate Desk</h4>
                <p className="text-xs text-[var(--text-tertiary)]">24/7 Gate Guard Wing</p>
              </div>
              <a href="tel:+919876543211" className="btn-primary py-1.5 px-3 text-xs gap-1.5">
                <Phone size={12} />
                <span>Call Gate</span>
              </a>
            </div>

            <div className="p-3 bg-black/2 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Ambulance & Medical Wing</h4>
                <p className="text-xs text-[var(--text-tertiary)]">Campus Health Center</p>
              </div>
              <a href="tel:+919876543212" className="btn-primary py-1.5 px-3 text-xs gap-1.5">
                <Phone size={12} />
                <span>Call Clinic</span>
              </a>
            </div>
          </div>
        </div>
      </CustomModal>

      {/* Announcements Notice Board Modal */}
      <CustomModal isOpen={showAnnouncementModal} onClose={() => setShowAnnouncementModal(false)} title="Hostel Notice Board">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="p-4 bg-pink-50 border border-pink-100 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="bg-pink-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">High Priority</span>
              <span className="text-[10px] text-pink-700">Oct 24, 2024</span>
            </div>
            <h4 className="text-sm font-bold text-pink-900">Mandatory Fire Safety Drill</h4>
            <p className="text-xs text-pink-800 mt-1 leading-relaxed">
              A mandatory fire safety and evacuation drill will be conducted tomorrow at 10:00 AM. All residents must participate and assemble at the main gate when alarm rings.
            </p>
            <p className="text-[10px] text-pink-700 font-medium mt-3">- Chief Warden's Office</p>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">Event Announcement</span>
              <span className="text-[10px] text-indigo-700">Oct 20, 2024</span>
            </div>
            <h4 className="text-sm font-bold text-indigo-900">Hostel Night & Community Dinner</h4>
            <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
              Join us for an evening of music, games, and a special buffet dinner this Friday at the central lawn. Registration starts today at block lobby desks.
            </p>
            <p className="text-[10px] text-indigo-700 font-medium mt-3">- Cultural Committee</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="bg-slate-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">General Notice</span>
              <span className="text-[10px] text-slate-700">Oct 18, 2024</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Wi-Fi Maintenance Schedule</h4>
            <p className="text-xs text-slate-800 mt-1 leading-relaxed">
              Hostel Wi-Fi network will undergo scheduled maintenance on Sunday between 2:00 AM and 5:00 AM. Internet service will be temporarily unavailable during this window.
            </p>
            <p className="text-[10px] text-slate-700 font-medium mt-3">- IT Support Desk</p>
          </div>
        </div>
      </CustomModal>
    </div>
  );
};

const styles = {
  loadingWrapper: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2.5rem',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '2rem',
    marginBottom: '2rem',
  },
  chartCard: {
    padding: '1.5rem',
  },
  chartHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  chartTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  chartContainer: {
    width: '100%',
  },
  chartContainerFlex: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  chartTooltip: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
  },
  legendContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    width: '35%',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  legendColor: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
    display: 'inline-block',
  },
  legendText: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxHeight: '270px',
    overflowY: 'auto',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem',
    background: 'rgba(0,0,0,0.015)',
    borderRadius: 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    gap: '1rem',
  },
  activityIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(0,0,0,0.02)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityMeta: {
    flexGrow: 1,
    overflow: 'hidden',
  },
  activityTitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  activityDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  emptyText: {
    textAlign: 'center',
    color: 'var(--text-tertiary)',
    padding: '2.5rem 0',
    fontSize: '0.85rem',
  },
  roomBanner: {
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2.5rem',
    background: 'linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(139,92,246,0.03) 100%)',
    border: '1px solid rgba(236,72,153,0.15)',
  },
  bannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  bannerTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  bannerSubtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  bannerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'var(--success-bg)',
    color: 'var(--success)',
    padding: '0.5rem 1rem',
    borderRadius: '30px',
    fontSize: '0.85rem',
    fontWeight: '600',
  }
};

export default Dashboard;

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
  CheckCircle, Clock, CalendarDays, UtensilsCrossed, Megaphone, Phone, ArrowRight, ShieldCheck, HelpCircle, ChevronRight, ChevronDown
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import CustomModal from '../components/CustomModal';

const COLORS = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'];

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
          const [rooms, students, complaints, invoices, visitors, messStats] = await Promise.all([
            api('/rooms'),
            api('/students'),
            api('/complaints'),
            api('/invoices'),
            api('/visitors'),
            api('/mess/stats')
          ]);

          const totalBeds = rooms.reduce((acc, r) => acc + r.sharingType, 0);
          const occupiedBeds = students.filter(s => s.roomId !== null).length;
          const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
          
          const pendingComplaints = complaints.filter(c => c.status !== 'RESOLVED').length;
          const activeVisitors = visitors.filter(v => v.checkOutTime === null).length;
          
          const unpaidInvoicesAmount = invoices
            .filter(i => i.status === 'UNPAID')
            .reduce((acc, i) => acc + i.amount, 0);

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
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="spinner"></div>
        <p className="text-slate-400 font-medium text-sm">Loading dashboard analytics...</p>
      </div>
    );
  }

  // WARDEN DASHBOARD VIEW
  if (user.role === 'ADMIN') {
    const { summary, charts, recentComplaints, recentVisitors } = stats || {};
    
    return (
      <div className="animate-fade-in flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h1 className="text-[28px] font-bold text-slate-800 tracking-tight leading-tight">Dashboard</h1>
            <p className="text-[14px] text-slate-500 font-medium">Overview of girls hostel operations and analytics</p>
          </div>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-[12px] text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
            <CalendarDays size={16} className="text-slate-500" />
            May 24, 2025
            <ChevronDown size={14} className="text-slate-400 ml-1" />
          </button>
        </div>

        {/* Stats Grid - Responsive 4 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Room Occupancy" 
            value={`${summary?.occupiedBeds || 3}/${summary?.totalBeds || 5} Beds`}
            subtitle="60% Occupancy Rate"
            icon={<Home size={22} />}
            color="#3b82f6"
          />
          <MetricCard 
            title="Pending Maintenance" 
            value={summary?.pendingComplaints || 2}
            subtitle="Pending repairs inspection"
            icon={<Wrench size={22} />}
            color="#f59e0b"
          />
          <MetricCard 
            title="Total Revenue Dues" 
            value={`₹${summary?.unpaidInvoicesAmount?.toLocaleString() || '15,500'}`}
            subtitle="Outstanding invoices"
            icon={<Receipt size={22} />}
            color="#10b981"
          />
          <MetricCard 
            title="Active Visitors" 
            value={summary?.activeVisitors || 0}
            subtitle="Logged guest check-ins"
            icon={<Users size={22} />}
            color="#8b5cf6"
          />
        </div>

        {/* Charts Row - Responsive 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Biometric dining chart */}
          <div className="glass-card p-6 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <UtensilsCrossed size={16} className="text-[var(--primary)]" />
                <h3 className="text-[13px] font-bold text-slate-800">Today's Dining Biometric Turnout</h3>
              </div>
              <button className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-[10px] text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Today
                <ChevronDown size={14} className="text-slate-400" />
              </button>
            </div>
            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.mealStatsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'rgba(226, 232, 240, 0.4)'}} contentStyle={{ background: '#fff', border: 'none', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="square" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="Attended" name="Ate (Biometric Verified)" fill="#f43f5e" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="Capacity" name="Total Roster" fill="#e2e8f0" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Block Occupancy chart */}
          <div className="glass-card p-6 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-bold text-slate-800">Occupancy by Hostel Block</h3>
              </div>
              <button className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-[10px] text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                This Month
                <ChevronDown size={14} className="text-slate-400" />
              </button>
            </div>
            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.roomBlockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={54} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'rgba(226, 232, 240, 0.4)'}} contentStyle={{ background: '#fff', border: 'none', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="square" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="occupied" name="Occupied Beds" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="rooms" name="Total Rooms" fill="#0f172a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Complaints and Visitors logs row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ticket distribution pie chart */}
          <div className="glass-card p-6 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-[13px] font-bold text-slate-800">Helpdesk Tickets Distribution</h3>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="w-full sm:w-[55%] h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts?.complaintChartData || [{name: 'PENDING', value: 1}, {name: 'IN_PROGRESS', value: 1}, {name: 'RESOLVED', value: 0}]}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {(charts?.complaintChartData || [{name: 'PENDING', value: 1}, {name: 'IN_PROGRESS', value: 1}, {name: 'RESOLVED', value: 0}]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[60%] left-[28%] sm:top-[60%] sm:left-[35%] transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <span className="block text-xs font-bold text-slate-500">Total</span>
                  <span className="block text-2xl font-extrabold text-slate-800">2</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full sm:w-[40%] pr-4 text-left">
                {charts?.complaintChartData?.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: COLORS[index % COLORS.length] }}></span>
                      <span className="font-semibold text-slate-600 capitalize">{entry.name.toLowerCase()}</span>
                    </div>
                    <span className="font-bold text-slate-800">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Maintenance tickets */}
          <div className="glass-card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Wrench size={18} className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Active Tickets</h3>
              </div>
              <button 
                onClick={() => navigate('/admin/complaints')}
                className="text-xs text-[var(--secondary)] hover:underline border-none bg-transparent cursor-pointer font-bold flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[260px] pr-2">
              {recentComplaints?.length === 0 ? (
                <p className="text-center py-12 text-slate-400 text-sm">No active maintenance tickets.</p>
              ) : (
                recentComplaints?.map(complaint => (
                  <div key={complaint.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all gap-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                        <Wrench size={16} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate">{complaint.category} Issue - Room {complaint.student?.room?.roomNumber || 'N/A'}</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{complaint.description}</p>
                      </div>
                    </div>
                    <span className={`badge shrink-0 ${
                      complaint.status === 'RESOLVED' ? 'badge-success' : 
                      complaint.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-danger'
                    }`}>
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
    <div className="animate-fade-in flex flex-col gap-8">
      {/* Latest Announcement Banner */}
      <div 
        onClick={() => setShowAnnouncementModal(true)}
        className="bg-[var(--primary)] text-white rounded-3xl p-8 relative overflow-hidden shadow-lg cursor-pointer hover:scale-[1.01] hover:shadow-xl transition-all duration-300 text-left border border-white/5"
      >
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-12">
          <Megaphone size={140} />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-blue-500/20 border border-blue-400/20 text-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
            Latest Announcement
          </span>
          <span className="text-white/60 text-xs font-medium">Oct 24, 2024</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight">Annual Sports Meet 2024</h2>
        <p className="text-white/80 text-xs mt-1.5 leading-relaxed max-w-md">Registrations are open until this Friday. Visit the Notice Board for details.</p>
        <div className="flex items-center gap-1 mt-6 text-xs font-bold text-blue-300 hover:text-blue-200 transition-all">
          <span>Read notice</span>
          <ArrowRight size={14} />
        </div>
      </div>

      {/* Grid of Navigation Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <div 
          onClick={() => navigate('/student/leaves')}
          className="glass-card p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-blue-500/20 transition-all duration-300 min-h-[140px]"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3.5 shadow-sm border border-blue-100">
            <CalendarDays size={22} />
          </div>
          <span className="text-xs font-bold text-slate-700 tracking-tight">Apply Leave</span>
        </div>

        <div 
          onClick={() => navigate('/student/complaints')}
          className="glass-card p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-blue-500/20 transition-all duration-300 min-h-[140px]"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3.5 shadow-sm border border-blue-100">
            <Wrench size={22} />
          </div>
          <span className="text-xs font-bold text-slate-700 tracking-tight">Raise Complaint</span>
        </div>

        <div 
          onClick={() => setShowGuestModal(true)}
          className="glass-card p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-blue-500/20 transition-all duration-300 min-h-[140px]"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3.5 shadow-sm border border-blue-100">
            <Users size={22} />
          </div>
          <span className="text-xs font-bold text-slate-700 tracking-tight">Guest Form</span>
        </div>

        <div 
          onClick={() => setShowAttendanceModal(true)}
          className="glass-card p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-blue-500/20 transition-all duration-300 min-h-[140px]"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3.5 shadow-sm border border-blue-100">
            <CheckCircle size={22} />
          </div>
          <span className="text-xs font-bold text-slate-700 tracking-tight">Attendance</span>
        </div>

        <div 
          onClick={() => setShowAnnouncementModal(true)}
          className="glass-card p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-blue-500/20 transition-all duration-300 min-h-[140px]"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3.5 shadow-sm border border-blue-100">
            <Megaphone size={22} />
          </div>
          <span className="text-xs font-bold text-slate-700 tracking-tight">Notice Board</span>
        </div>

        <div 
          onClick={() => setShowContactModal(true)}
          className="glass-card p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-blue-500/20 transition-all duration-300 min-h-[140px]"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3.5 shadow-sm border border-blue-100">
            <Phone size={22} />
          </div>
          <span className="text-xs font-bold text-slate-700 tracking-tight">Phone Directory</span>
        </div>
      </div>

      {/* Upcoming Events Section */}
      <div className="glass-card p-6 shadow-sm text-left">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5">Upcoming Events</h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all">
            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-500 font-bold shrink-0 shadow-sm border border-slate-200/50">
              <span className="text-[10px] uppercase leading-none">OCT</span>
              <span className="text-base leading-none mt-1.5 font-extrabold">24</span>
            </div>
            <div className="flex-grow">
              <h4 className="text-sm font-bold text-slate-800">Warden Interactive Session</h4>
              <p className="text-xs text-slate-400 mt-1">4:00 PM • Common Room</p>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </div>

          <div className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all">
            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-500 font-bold shrink-0 shadow-sm border border-slate-200/50">
              <span className="text-[10px] uppercase leading-none">OCT</span>
              <span className="text-base leading-none mt-1.5 font-extrabold">29</span>
            </div>
            <div className="flex-grow">
              <h4 className="text-sm font-bold text-slate-800">Hostel Night & Community Dinner</h4>
              <p className="text-xs text-slate-400 mt-1">8:00 PM • Central Lawn</p>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </div>
        </div>
      </div>

      {/* Guest Pre-registration Form Modal */}
      <CustomModal isOpen={showGuestModal} onClose={() => setShowGuestModal(false)} title="Guest Pre-Registration Form">
        <form onSubmit={handleGuestSubmit} className="form-grid">
          <div className="form-group mb-0 full-width">
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
          <div className="form-group mb-0 full-width">
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
          <div className="form-group mb-0 full-width">
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
          <div className="form-group mb-0 full-width">
            <label className="form-label">Date of Visit</label>
            <input 
              type="date" 
              className="form-input" 
              required 
              value={guestForm.date}
              onChange={(e) => setGuestForm({...guestForm, date: e.target.value})}
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 full-width">
            <button type="button" className="btn-secondary h-11 px-5" onClick={() => setShowGuestModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary h-11 px-5">Register Guest</button>
          </div>
        </form>
      </CustomModal>

      {/* Attendance History Modal */}
      <CustomModal isOpen={showAttendanceModal} onClose={() => setShowAttendanceModal(false)} title="My Roster Attendance">
        <div className="flex flex-col gap-5 text-left">
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">Today's Dining Count:</span>
            <span className="text-xs font-extrabold text-blue-900 bg-white border border-blue-100 px-3 py-1 rounded shadow-sm">{checkedInToday} / 4 Meals Eaten</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Simulated Biometric Check-ins</h4>
            <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white max-h-[300px] overflow-y-auto shadow-sm">
              <div className="p-3.5 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Dinner</span>
                <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">Verified</span>
              </div>
              <div className="p-3.5 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Snacks</span>
                <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">Verified</span>
              </div>
              <div className="p-3.5 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Lunch</span>
                <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">Verified</span>
              </div>
              <div className="p-3.5 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Breakfast</span>
                <span className="text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Missed</span>
              </div>
            </div>
          </div>
        </div>
      </CustomModal>

      {/* Emergency Directory Modal */}
      <CustomModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} title="Emergency Directory">
        <div className="flex flex-col gap-4 text-left">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Immediate hotlines for security and resident assistance.</p>
          <div className="flex flex-col gap-3">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Dr. Shalini Sharma</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Chief Hostel Warden</p>
              </div>
              <a href="tel:+919876543210" className="btn-primary h-10 px-4 text-xs shrink-0 w-full sm:w-auto justify-center">
                <Phone size={14} />
                <span>Call Warden</span>
              </a>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Main Security Gate Desk</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5">24/7 Gate Guard Wing</p>
              </div>
              <a href="tel:+919876543211" className="btn-primary h-10 px-4 text-xs shrink-0 w-full sm:w-auto justify-center">
                <Phone size={14} />
                <span>Call Gate</span>
              </a>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Ambulance & Medical Wing</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Campus Health Center</p>
              </div>
              <a href="tel:+919876543212" className="btn-primary h-10 px-4 text-xs shrink-0 w-full sm:w-auto justify-center">
                <Phone size={14} />
                <span>Call Clinic</span>
              </a>
            </div>
          </div>
        </div>
      </CustomModal>

      {/* Announcements Notice Board Modal */}
      <CustomModal isOpen={showAnnouncementModal} onClose={() => setShowAnnouncementModal(false)} title="Hostel Notice Board">
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1 text-left">
          <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">Event Announcement</span>
              <span className="text-[10px] text-indigo-700 font-bold">Oct 20, 2024</span>
            </div>
            <h4 className="text-sm font-bold text-indigo-900 leading-tight">Hostel Night & Community Dinner</h4>
            <p className="text-xs text-indigo-800 mt-2 leading-relaxed">
              Join us for an evening of music, games, and a special buffet dinner this Friday at the central lawn. Registration starts today at block lobby desks.
            </p>
            <p className="text-[10px] text-indigo-700 font-semibold mt-4">- Cultural Committee</p>
          </div>

          <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="bg-slate-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">General Notice</span>
              <span className="text-[10px] text-slate-700 font-bold">Oct 18, 2024</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">Wi-Fi Maintenance Schedule</h4>
            <p className="text-xs text-slate-800 mt-2 leading-relaxed">
              Hostel Wi-Fi network will undergo scheduled maintenance on Sunday between 2:00 AM and 5:00 AM. Internet service will be temporarily unavailable during this window.
            </p>
            <p className="text-[10px] text-slate-700 font-semibold mt-4">- IT Support Desk</p>
          </div>
        </div>
      </CustomModal>
    </div>
  );
};

export default Dashboard;


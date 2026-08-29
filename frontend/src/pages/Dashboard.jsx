import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  rooms as roomsApi,
  students as studentsApi,
  complaints as complaintsApi,
  fees as feesApi,
  visitors as visitorsApi,
  mess as messApi,
  leaves as leavesApi,
  dashboard as dashboardApi
} from '../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Users, Home, Wrench, ShieldAlert, Receipt, Sparkles,
  CheckCircle, Clock, CalendarDays, UtensilsCrossed, Megaphone, Phone, ArrowRight, ShieldCheck, HelpCircle, ChevronRight, ChevronDown, Building2, Layers, BookOpen
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import CustomModal from '../components/CustomModal';

const COLORS = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'];

const FLOOR_OPTIONS = [
  { num: 1, name: 'Rajken Enterprises', label: 'Floor 1', sub: 'Hari Pushp Girls Hostel', icon: '🏠', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { num: 2, name: 'Vandana Enterprises', label: 'Floor 2', sub: 'Vandana Girls Hostel', icon: '🏢', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { num: 3, name: 'Pushpa Enterprises', label: 'Floor 3', sub: 'Pushpa Girls Hostel', icon: '🏙️', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { num: 4, name: 'Harish Chandra Enterprises', label: 'Floor 4', sub: 'Harish Chandra Girls Hostel', icon: '🌿', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { num: 5, name: 'Ramesh Enterprises', label: 'Floor 5 & 6', sub: 'Ramesh Girls Hostel', icon: '⭐', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { num: 'combined', name: 'Consolidated View', label: 'All 5 Floors', sub: 'Meenakshi Enterprises Catering', icon: '🌐', gradient: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' },
];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Default to assignedFloor if floor warden, or 'combined' for Super Admin
  const [selectedFloor, setSelectedFloor] = useState(() => {
    return user?.assignedFloor ? String(user.assignedFloor) : 'combined';
  });
  const [showFloorModal, setShowFloorModal] = useState(false);

  const [rawRooms, setRawRooms] = useState([]);
  const [rawStudents, setRawStudents] = useState([]);
  const [rawComplaints, setRawComplaints] = useState([]);
  const [rawInvoices, setRawInvoices] = useState([]);
  const [rawVisitors, setRawVisitors] = useState([]);
  const [rawMessStats, setRawMessStats] = useState(null);

  const [showContactModal, setShowContactModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [guestForm, setGuestForm] = useState({ name: '', relationship: 'Father', phone: '', date: '' });
  const [guestSubmitted, setGuestSubmitted] = useState(false);

  // Sync selectedFloor with user assignedFloor if dedicated floor warden
  useEffect(() => {
    if (user?.role === 'ADMIN' && user?.assignedFloor) {
      setSelectedFloor(String(user.assignedFloor));
    }
  }, [user]);

  const handleSelectFloorChoice = (num) => {
    const val = String(num);
    setSelectedFloor(val);
    setShowFloorModal(false);
  };

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        if (user.role === 'ADMIN') {
          const [rooms, students, complaints, invoices, visitors, messStats] = await Promise.all([
            roomsApi.getAll(),
            studentsApi.getAll(),
            complaintsApi.getAll(),
            feesApi.getAll(),
            visitorsApi.getAll(),
            messApi.getStats()
          ]);

          setRawRooms(rooms || []);
          setRawStudents(students || []);
          setRawComplaints(complaints || []);
          setRawInvoices(invoices || []);
          setRawVisitors(visitors || []);
          setRawMessStats(messStats);
        } else if (user.role === 'STUDENT') {
          const dashData = await dashboardApi.getDashboard();
          setStats({
            studentProfile: dashData.profile,
            activeComplaint: dashData.stats.pendingComplaints,
            outstandingFees: dashData.stats.totalDue,
            activeLeaves: dashData.stats.pendingLeaves,
            checkedInToday: dashData.messAttendance.filter(d => d.date === new Date().toISOString().split('T')[0]).length,
            recentComplaints: dashData.complaints.slice(0, 3),
            recentInvoices: dashData.invoices.slice(0, 3),
            recentLeaves: dashData.leaves.slice(0, 3)
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [user]);

  // Re-calculate admin stats whenever selectedFloor or raw data changes
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;

    let filteredRooms = rawRooms || [];
    let filteredStudents = rawStudents || [];

    if (selectedFloor && selectedFloor !== 'combined' && selectedFloor !== 'all') {
      const fNum = parseInt(selectedFloor, 10);
      filteredRooms = rawRooms.filter(r => r.floorNumber === fNum);
      const roomIds = new Set(filteredRooms.map(r => r.id));
      filteredStudents = rawStudents.filter(s => roomIds.has(s.roomId));
    }

    const totalBeds = filteredRooms.reduce((acc, r) => acc + r.sharingType, 0);
    const occupiedBeds = filteredStudents.filter(s => s.roomId !== null).length;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    const filteredStudentUserIds = new Set(filteredStudents.map(s => s.id));
    const filteredComplaints = rawComplaints.filter(c => filteredStudentUserIds.has(c.studentId));
    const pendingComplaints = filteredComplaints.filter(c => c.status !== 'RESOLVED').length;

    const activeVisitors = rawVisitors.filter(v => v.checkOutTime === null && filteredStudentUserIds.has(v.studentId)).length;

    const filteredInvoices = rawInvoices.filter(i => filteredStudentUserIds.has(i.studentId));
    const unpaidInvoicesAmount = filteredInvoices
      .filter(i => i.status === 'UNPAID')
      .reduce((acc, i) => acc + i.amount, 0);

    const roomBlockData = filteredRooms.reduce((acc, r) => {
      const block = r.block || `Floor ${r.floorNumber}`;
      if (!acc[block]) acc[block] = { name: block, rooms: 0, occupied: 0 };
      acc[block].rooms += 1;
      acc[block].occupied += r.students?.length || 0;
      return acc;
    }, {});

    const complaintStatusCounts = filteredComplaints.reduce((acc, c) => {
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
        unpaidInvoicesAmount,
        totalRooms: filteredRooms.length,
        totalStudents: filteredStudents.length
      },
      charts: {
        roomBlockData: Object.values(roomBlockData),
        complaintChartData,
        mealStatsChartData: rawMessStats?.mealStatsChartData || [],
        historyChartData: rawMessStats?.historyChartData || []
      },
      recentComplaints: filteredComplaints.slice(0, 5),
      recentVisitors: rawVisitors.filter(v => filteredStudentUserIds.has(v.studentId)).slice(0, 5)
    });
  }, [selectedFloor, rawRooms, rawStudents, rawComplaints, rawInvoices, rawVisitors, rawMessStats, user]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="spinner"></div>
        <p className="text-slate-400 font-medium text-sm">Loading dashboard analytics...</p>
      </div>
    );
  }

  // WARDEN / ADMIN DASHBOARD VIEW
  if (user.role === 'ADMIN') {
    const defaultSummary = { occupancyRate: 0, occupiedBeds: 0, totalBeds: 0, pendingComplaints: 0, activeVisitors: 0, unpaidInvoicesAmount: 0, totalRooms: 0, totalStudents: 0 };
    const defaultCharts = { roomBlockData: [], complaintChartData: [], mealStatsChartData: [], historyChartData: [] };
    const summary = stats?.summary || defaultSummary;
    const charts = stats?.charts || defaultCharts;
    const recentComplaints = stats?.recentComplaints || [];
    const activeFloorConfig = FLOOR_OPTIONS.find(f => String(f.num) === String(selectedFloor)) || FLOOR_OPTIONS[5];

    return (
      <div className="animate-fade-in flex flex-col gap-6">

        {/* ── Floor / Workspace Selector Modal (Opened on login) ── */}
        <CustomModal 
          isOpen={showFloorModal} 
          onClose={() => setShowFloorModal(false)} 
          title="Select Workspace & Floor Directory"
        >
          <div className="flex flex-col gap-4 text-left">
            <p className="text-xs text-slate-500 font-medium">
              Welcome Chief Warden. Select a floor workspace below to view filtered analytics, room occupancy, maintenance complaints, and invoice reports:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
              {FLOOR_OPTIONS.map((item) => (
                <div
                  key={item.label}
                  onClick={() => handleSelectFloorChoice(item.num)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3.5 ${
                    String(selectedFloor) === String(item.num)
                      ? 'border-indigo-600 bg-indigo-50/60 shadow-md'
                      : 'border-slate-100 hover:border-indigo-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                    <h4 className="text-sm font-bold text-slate-800 truncate">{item.name}</h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.sub}</p>
                  </div>
                  {String(selectedFloor) === String(item.num) && (
                    <CheckCircle size={20} className="text-indigo-600 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button 
                onClick={() => handleSelectFloorChoice('combined')}
                className="btn-primary h-11 px-6 text-xs font-bold"
              >
                Open Consolidated View
              </button>
            </div>
          </div>
        </CustomModal>

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-1">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-[28px] font-bold text-slate-800 tracking-tight leading-tight">Dashboard</h1>
              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <span>{activeFloorConfig.icon}</span>
                <span>{activeFloorConfig.name}</span>
              </span>
            </div>
            <p className="text-[14px] text-slate-500 font-medium">
              Active Workspace: <b>{activeFloorConfig.name}</b> ({activeFloorConfig.sub})
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => navigate('/admin/tally')}
              className="flex items-center gap-2 bg-slate-900 text-emerald-400 px-4 py-2.5 rounded-[12px] text-[13px] font-bold shadow-md hover:bg-slate-800 transition-all border-none cursor-pointer"
            >
              <BookOpen size={16} />
              <span>📖 Tally ERP Ledger</span>
            </button>

            <button 
              onClick={() => setShowFloorModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-[12px] text-[13px] font-bold shadow-md hover:bg-indigo-700 transition-all border-none cursor-pointer"
            >
              <Layers size={16} />
              <span>Choose Floor Workspace</span>
            </button>

            <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
              <CalendarDays size={16} className="text-slate-500" />
              {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </button>
          </div>
        </div>

        {/* ── 5 Floor Choice Cards + Consolidated View (ALWAYS VISIBLE AT TOP OF DASHBOARD) ── */}
        <div className="glass-card p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4 text-left bg-gradient-to-br from-slate-50/50 to-white">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Select Floor & Company Workspace</h3>
                <p className="text-xs text-slate-400 font-medium">Click any floor below to instantly load its specific dashboard, rooms, and financial reports</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/admin/floors')}
              className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-xs font-bold border-none bg-transparent cursor-pointer"
            >
              <span>Full Directory Page</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 mt-1">
            {FLOOR_OPTIONS.map((item) => {
              const isSelected = String(selectedFloor) === String(item.num);
              return (
                <div
                  key={item.label}
                  onClick={() => handleSelectFloorChoice(item.num)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[110px] relative overflow-hidden ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl scale-[1.03]'
                      : 'bg-white border-slate-100 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{item.icon}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                      {item.label}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className={`text-xs font-extrabold leading-tight truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {item.name}
                    </p>
                    <p className={`text-[10px] font-medium truncate mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                      {item.sub}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Grid - Responsive 4 Columns (Filtered for chosen floor) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Room Occupancy" 
            value={`${summary?.occupiedBeds || 0}/${summary?.totalBeds || 0} Beds`}
            subtitle={`${summary?.occupancyRate || 0}% Occupancy Rate`}
            icon={<Home size={22} />}
            color="#3b82f6"
          />
          <MetricCard 
            title="Pending Maintenance" 
            value={summary?.pendingComplaints || 0}
            subtitle="Pending repairs inspection"
            icon={<Wrench size={22} />}
            color="#f59e0b"
          />
          <MetricCard 
            title="Total Revenue Dues" 
            value={`₹${summary?.unpaidInvoicesAmount?.toLocaleString() || '0'}`}
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
                <h3 className="text-[13px] font-bold text-slate-800">Occupancy by Room Block</h3>
              </div>
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
                  <span className="block text-2xl font-extrabold text-slate-800">
                    {(charts?.complaintChartData || []).reduce((sum, e) => sum + e.value, 0)}
                  </span>
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
                <p className="text-center py-12 text-slate-400 text-sm">No active maintenance tickets for this workspace.</p>
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
    checkedInToday = 0
  } = stats || {};
  const allocatedRoom = studentProfile?.room;

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      {/* Student Profile Hero Card */}
      <div className="bg-gradient-to-br from-[#4f46e5] to-[#2563eb] text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-[0_8px_32px_rgba(79,70,229,0.3)] border border-white/10">
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

export default Dashboard;

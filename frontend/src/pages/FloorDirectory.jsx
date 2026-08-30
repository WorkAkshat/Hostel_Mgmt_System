import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Users, BedDouble, BarChart3, ArrowLeft,
  Search, Phone, GraduationCap, IndianRupee, CheckCircle2,
  AlertCircle, ChevronRight, X, Download, RefreshCw
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:9000/api/v1';

// ─── Floor themes ─────────────────────────────────────────────────────────────
const FLOOR_THEMES = [
  { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', light: '#f0ebff', text: '#5b21b6', icon: '🏠' },
  { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', light: '#fff0f6', text: '#be185d', icon: '🏢' },
  { gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', light: '#eff9ff', text: '#0369a1', icon: '🏙️' },
  { gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', light: '#ecfdf5', text: '#065f46', icon: '🌿' },
  { gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', light: '#fffbeb', text: '#92400e', icon: '⭐' },
];
const COMBINED_THEME = { gradient: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', light: '#eff6ff', text: '#1d4ed8', icon: '🌐' };

const fmtCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtPct = (n) => `${n}%`;

// ─── Floor Card ───────────────────────────────────────────────────────────────
const FloorCard = ({ floor, theme, onClick, idx }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.07 }}
    whileHover={{ y: -4, scale: 1.02 }}
    onClick={onClick}
    style={{ cursor: 'pointer' }}
    className="glass-card rounded-[20px] overflow-hidden border border-white/60 shadow-md hover:shadow-xl transition-shadow"
  >
    {/* Gradient header */}
    <div style={{ background: theme.gradient }} className="p-5 flex items-center justify-between">
      <div className="text-white">
        <span className="text-3xl">{theme.icon}</span>
        <div className="mt-2 text-sm font-semibold opacity-80">{floor.floorLabel || `Floor ${floor.floorNumber}`}</div>
        <div className="text-base font-bold leading-tight mt-0.5">{floor.companyName}</div>
        <div className="text-xs opacity-70 mt-0.5">{floor.hostelName}</div>
      </div>
      <div className="text-white text-right">
        <div className="text-3xl font-black">{floor.stats?.totalStudents ?? 0}</div>
        <div className="text-xs opacity-80">Residents</div>
      </div>
    </div>

    {/* Stats bar */}
    <div className="p-4 grid grid-cols-3 gap-3">
      {[
        { label: 'Rooms', value: floor.stats?.totalRooms ?? 0, icon: <BedDouble size={14} /> },
        { label: 'Available', value: floor.stats?.availableRooms ?? 0, icon: <CheckCircle2 size={14} /> },
        { label: 'Occupancy', value: fmtPct(floor.stats?.occupancyPct ?? 0), icon: <BarChart3 size={14} /> },
      ].map((s) => (
        <div key={s.label} className="text-center">
          <div className="flex items-center justify-center gap-1 text-[var(--text-tertiary)] mb-1">{s.icon}<span className="text-[10px]">{s.label}</span></div>
          <div className="text-[15px] font-bold text-[var(--text-primary)]">{s.value}</div>
        </div>
      ))}
    </div>

    <div className="px-4 pb-4">
      <button
        style={{ background: theme.gradient }}
        className="w-full py-2.5 rounded-[12px] text-white text-sm font-semibold flex items-center justify-center gap-2 border-none cursor-pointer"
      >
        View Directory <ChevronRight size={16} />
      </button>
    </div>
  </motion.div>
);

// ─── Student Row ──────────────────────────────────────────────────────────────
const StudentRow = ({ student, theme }) => (
  <div className="flex items-center gap-4 p-4 rounded-[14px] bg-white border border-slate-100 hover:border-slate-200 transition-colors shadow-sm">
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
      style={{ background: theme.gradient }}
    >
      {student.name.charAt(0).toUpperCase()}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-[var(--text-primary)] text-sm">{student.name}</span>
        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{student.rollNumber}</span>
        {student.bedId && (
          <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
            🛏️ Bed: {student.bedId}
          </span>
        )}
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${student.status === 'CHECKED_IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {student.status}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        <span className="text-[11px] text-slate-400 flex items-center gap-1"><Phone size={10} />{student.phoneNumber}</span>
        {student.coachingCollege && <span className="text-[11px] text-slate-400 flex items-center gap-1"><GraduationCap size={10} />{student.coachingCollege}</span>}
      </div>
    </div>
    <div className="text-right flex-shrink-0">
      {student.latestInvoice ? (
        <>
          <div className={`text-[11px] font-bold ${student.latestInvoice.status === 'PAID' ? 'text-emerald-600' : 'text-rose-500'}`}>
            {student.latestInvoice.status}
          </div>
          <div className="text-[11px] text-slate-400">{fmtCurrency(student.latestInvoice.amount)}</div>
        </>
      ) : (
        <span className="text-[11px] text-slate-300">No invoice</span>
      )}
    </div>
  </div>
);

// ─── Room Block ───────────────────────────────────────────────────────────────
const RoomBlock = ({ room, theme }) => {
  let beds = [];
  try {
    beds = typeof room.bedMapping === 'string' ? JSON.parse(room.bedMapping || '[]') : (room.bedMapping || []);
  } catch (e) {
    beds = [];
  }

  return (
    <div className="mb-6 p-4 rounded-[18px] bg-slate-50/50 border border-slate-200/60 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-white text-base font-black flex-shrink-0" style={{ background: theme.gradient }}>
            {room.roomNumber}
          </div>
          <div>
            <div className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span>Room {room.roomNumber}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                {room.sharingType === 1 ? 'Single Seater' : room.sharingType === 2 ? 'Double Seater' : 'Triple Seater'}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{room.sharingLabel || `${room.sharingType} Beds`} · {room.isAc ? '❄️ AC' : 'Non-AC'} · {fmtCurrency(room.monthlyFee)}/mo</div>
          </div>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${room.status === 'FULL' ? 'bg-rose-100 text-rose-700' : room.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {room.occupancy}/{room.capacity} Beds · {room.status}
        </span>
      </div>

      {/* Bed Mapping Badges */}
      {beds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 pl-1 sticky">
          {beds.map((bId) => {
            const occupiedStudent = room.students?.find(s => s.bedId === bId);
            return (
              <div
                key={bId}
                className={`text-xs px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 border shadow-2xs ${
                  occupiedStudent
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                <span>🛏️ {bId}</span>
                <span className="text-[10px] font-normal opacity-80">
                  {occupiedStudent ? `(${occupiedStudent.name})` : '• Vacant'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {room.students && room.students.length > 0
          ? room.students.map((s) => <StudentRow key={s.id} student={s} theme={theme} />)
          : <div className="text-xs text-slate-400 italic py-2 pl-2">No residents currently assigned</div>
        }
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FloorDirectory() {
  const { user } = useAuth();
  const token = user?.token || localStorage.getItem('token');

  const [floors, setFloors]           = useState([]);
  const [selectedFloor, setSelected]  = useState(null); // null = overview, 'combined' = all, or floor obj
  const [floorDetail, setFloorDetail] = useState(null);
  const [report, setReport]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch]           = useState('');
  const [activeTab, setActiveTab]     = useState('directory'); // 'directory' | 'report'
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportLoading, setReportLoading] = useState(false);

  const floorsFetchedRef = useRef(false);

  // Load all floors ONCE on mount
  useEffect(() => {
    if (!token || floorsFetchedRef.current) return;
    floorsFetchedRef.current = true;
    const fetchFloors = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/floors`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setFloors(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchFloors();
  }, [token]);

  // Load floor detail (students)
  const loadFloorDetail = useCallback(async (floorNumber) => {
    setDetailLoading(true);
    setFloorDetail(null);
    try {
      const res = await fetch(`${API_BASE}/floors/${floorNumber}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setFloorDetail(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  }, [token]);

  // Load report for selected floor
  const loadReport = useCallback(async (floorNumber) => {
    setReportLoading(true);
    setReport(null);
    try {
      const endpoint = floorNumber === 'combined'
        ? `${API_BASE}/floors/consolidated/report?month=${reportMonth}`
        : `${API_BASE}/floors/${floorNumber}/report?month=${reportMonth}`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setReportLoading(false);
    }
  }, [token, reportMonth]);

  const handleSelectFloor = (floor) => {
    setSelected(floor);
    setSearch('');
    setActiveTab('directory');
    if (floor === 'combined') {
      loadReport('combined');
      setActiveTab('report');
    } else {
      loadFloorDetail(floor.floorNumber);
    }
  };

  useEffect(() => {
    if (activeTab === 'report' && selectedFloor) {
      const fn = selectedFloor === 'combined' ? 'combined' : selectedFloor.floorNumber;
      loadReport(fn);
    }
  }, [activeTab, reportMonth, selectedFloor, loadReport]);

  const getTheme = (floor) => {
    if (floor === 'combined') return COMBINED_THEME;
    return FLOOR_THEMES[(floor.floorNumber - 1) % FLOOR_THEMES.length];
  };

  // Filter students by search
  const filteredRooms = (floorDetail?.rooms ?? []).map((room) => ({
    ...room,
    students: room.students.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
        s.phoneNumber.includes(search)
    ),
  })).filter((r) => r.students.length > 0 || !search);

  // ── Overview ────────────────────────────────────────────────────────────────
  if (!selectedFloor) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-black text-[var(--text-primary)]">🏢 Floor Directory</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Select a floor to view room-wise residents, or choose <b>Consolidated View</b> for the combined financial report across all 5 floors and Meenakshi Enterprises Catering.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="spinner" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 5 floor cards */}
            {floors.map((floor, idx) => (
              <FloorCard
                key={floor.id}
                floor={floor}
                theme={FLOOR_THEMES[(floor.floorNumber - 1) % FLOOR_THEMES.length]}
                onClick={() => handleSelectFloor(floor)}
                idx={idx}
              />
            ))}

            {/* Combined card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: floors.length * 0.07 }}
              whileHover={{ y: -4, scale: 1.02 }}
              onClick={() => handleSelectFloor('combined')}
              style={{ cursor: 'pointer' }}
              className="glass-card rounded-[20px] overflow-hidden border-2 border-blue-200 shadow-md hover:shadow-xl transition-shadow"
            >
              <div style={{ background: COMBINED_THEME.gradient }} className="p-5">
                <span className="text-3xl">🌐</span>
                <div className="text-white mt-2">
                  <div className="text-sm font-semibold opacity-80">Consolidated View</div>
                  <div className="text-base font-bold">All 5 Floors Combined</div>
                  <div className="text-xs opacity-70 mt-0.5">Including Meenakshi Enterprises (Catering)</div>
                </div>
              </div>
              <div className="p-4 text-center">
                <div className="text-sm text-slate-500 mb-3">View combined financial report for all floors & food billing @ ₹3,000/student</div>
                <button style={{ background: COMBINED_THEME.gradient }} className="w-full py-2.5 rounded-[12px] text-white text-sm font-semibold flex items-center justify-center gap-2 border-none cursor-pointer">
                  View Consolidated <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  // ── Floor Detail ────────────────────────────────────────────────────────────
  const floorName = selectedFloor === 'combined' ? 'Consolidated – All 5 Floors' : selectedFloor.companyName;

  return (
    <div>
      {/* Back + Title */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => { setSelected(null); setFloorDetail(null); setReport(null); }}
          className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
            <span>{getTheme(selectedFloor).icon}</span> {floorName}
          </h1>
          {selectedFloor !== 'combined' && (
            <p className="text-xs text-slate-400 mt-0.5">{selectedFloor.hostelName} · {selectedFloor.floorLabel}</p>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      {selectedFloor !== 'combined' && (
        <div className="flex gap-2 mb-5">
          {['directory', 'report'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-[12px] text-sm font-semibold border cursor-pointer transition-colors capitalize ${activeTab === tab ? 'bg-[var(--primary)] text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {tab === 'directory' ? '📋 Directory' : '📊 Financial Report'}
            </button>
          ))}
        </div>
      )}

      {/* ── DIRECTORY TAB ── */}
      {activeTab === 'directory' && selectedFloor !== 'combined' && (
        <>
          {/* Search */}
          <div className="relative mb-5">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, roll number or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-[12px] bg-white border border-slate-200 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-400"><X size={14} /></button>
            )}
          </div>

          {/* Summary chips */}
          {floorDetail && (
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { label: 'Total Rooms', value: floorDetail.rooms?.length },
                { label: 'Total Residents', value: floorDetail.summary?.totalStudents },
                { label: 'Mess Total', value: fmtCurrency(floorDetail.summary?.messFeeTotal) },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-2 bg-white border border-slate-100 px-4 py-2 rounded-full shadow-sm">
                  <span className="text-xs text-slate-400">{c.label}:</span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">{c.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Room list */}
          {detailLoading ? (
            <div className="flex items-center justify-center h-48"><div className="spinner" /></div>
          ) : filteredRooms.length > 0 ? (
            filteredRooms.map((room) => (
              <RoomBlock key={room.id} room={room} theme={getTheme(selectedFloor)} />
            ))
          ) : (
            <div className="text-center py-16 text-slate-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{search ? 'No students match your search.' : 'No students on this floor.'}</p>
            </div>
          )}
        </>
      )}

      {/* ── REPORT TAB ── */}
      {(activeTab === 'report' || selectedFloor === 'combined') && (
        <div>
          {/* Month picker */}
          <div className="flex items-center gap-3 mb-5">
            <label className="text-sm font-semibold text-slate-600">Billing Month:</label>
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="px-3 py-2 rounded-[10px] border border-slate-200 text-sm bg-white outline-none focus:border-[var(--primary)]"
            />
            <button onClick={() => { const fn = selectedFloor === 'combined' ? 'combined' : selectedFloor.floorNumber; loadReport(fn); }} className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[var(--primary)] text-white text-sm font-semibold border-none cursor-pointer">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {reportLoading ? (
            <div className="flex items-center justify-center h-48"><div className="spinner" /></div>
          ) : report ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Total Students',  value: report.summary?.totalStudents ?? report.grandTotal?.totalStudents, icon: <Users size={18} /> },
                  { label: 'Grand Total Due', value: fmtCurrency(report.summary?.grandTotal ?? report.grandTotal?.total), icon: <IndianRupee size={18} /> },
                  { label: 'Collected',       value: fmtCurrency(report.summary?.totalCollected ?? report.grandTotal?.collected), icon: <CheckCircle2 size={18} /> },
                  { label: 'Pending',         value: fmtCurrency(report.summary?.totalPending ?? report.grandTotal?.pending), icon: <AlertCircle size={18} /> },
                ].map((c, i) => (
                  <div key={i} className="glass-card p-4 rounded-[16px] border border-white/60">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">{c.icon}<span className="text-xs">{c.label}</span></div>
                    <div className="text-lg font-black text-[var(--text-primary)]">{c.value}</div>
                  </div>
                ))}
              </div>

              {/* Consolidated floor-wise table */}
              {report.floors && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-600 mb-3">Company & Floor-wise Breakdown</h3>
                  <div className="overflow-x-auto rounded-[16px] border border-slate-100">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          {['Floor', 'Company', 'Students', 'Hostel Fee', 'Mess Fee', 'Electricity', 'Grand Total', 'Collected', 'Pending'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.floors.map((f, i) => (
                          <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-semibold">{f.floor?.floorNumber}</td>
                            <td className="px-4 py-3 text-xs font-medium">{f.floor?.companyName}</td>
                            <td className="px-4 py-3">{f.summary?.totalStudents}</td>
                            <td className="px-4 py-3">{fmtCurrency(f.summary?.totalHostelFee)}</td>
                            <td className="px-4 py-3">{fmtCurrency(f.summary?.totalMessFee)}</td>
                            <td className="px-4 py-3">{fmtCurrency(f.summary?.totalElectricity)}</td>
                            <td className="px-4 py-3 font-bold">{fmtCurrency(f.summary?.grandTotal)}</td>
                            <td className="px-4 py-3 text-emerald-600 font-semibold">{fmtCurrency(f.summary?.totalCollected)}</td>
                            <td className="px-4 py-3 text-rose-500 font-semibold">{fmtCurrency(f.summary?.totalPending)}</td>
                          </tr>
                        ))}
                        {/* Meenakshi Catering row */}
                        <tr className="border-t-2 border-blue-200 bg-blue-50">
                          <td className="px-4 py-3 font-bold" colSpan={2}>Meenakshi Enterprises (Catering)</td>
                          <td className="px-4 py-3 font-bold">{report.grandTotal?.totalStudents}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs" colSpan={2}>₹3,000 × {report.grandTotal?.totalStudents} students</td>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3 font-bold text-blue-700">{fmtCurrency(report.grandTotal?.meenakshiCatering)}</td>
                          <td colSpan={2} />
                        </tr>
                        {/* Grand Total row */}
                        <tr className="border-t-2 border-slate-300 bg-slate-100 font-black">
                          <td className="px-4 py-3" colSpan={2}>GRAND TOTAL</td>
                          <td className="px-4 py-3">{report.grandTotal?.totalStudents}</td>
                          <td className="px-4 py-3">{fmtCurrency(report.grandTotal?.hostelFee)}</td>
                          <td className="px-4 py-3">{fmtCurrency(report.grandTotal?.messFee)}</td>
                          <td className="px-4 py-3">{fmtCurrency(report.grandTotal?.electricity)}</td>
                          <td className="px-4 py-3 text-[var(--primary)]">{fmtCurrency(report.grandTotal?.total)}</td>
                          <td className="px-4 py-3 text-emerald-700">{fmtCurrency(report.grandTotal?.collected)}</td>
                          <td className="px-4 py-3 text-rose-600">{fmtCurrency(report.grandTotal?.pending)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Per-student table (single floor report) */}
              {report.students && (
                <div className="overflow-x-auto rounded-[16px] border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Resident', 'Room', 'Sharing', 'Hostel Fee', 'Mess', 'Electricity', 'Total', 'Paid', 'Pending'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.students.map((s, i) => (
                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">{s.name}</td>
                          <td className="px-4 py-3">{s.roomNumber}</td>
                          <td className="px-4 py-3">{s.sharingType}</td>
                          <td className="px-4 py-3">{fmtCurrency(s.hostelFee)}</td>
                          <td className="px-4 py-3">{fmtCurrency(s.messFee)}</td>
                          <td className="px-4 py-3">{fmtCurrency(s.electricity)}</td>
                          <td className="px-4 py-3 font-bold">{fmtCurrency(s.total)}</td>
                          <td className="px-4 py-3 text-emerald-600">{fmtCurrency(s.paid)}</td>
                          <td className="px-4 py-3 text-rose-500">{fmtCurrency(s.pending)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a month and click Refresh to load the report.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

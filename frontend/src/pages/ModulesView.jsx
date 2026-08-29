import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  demandNotes as demandNotesApi,
  electricity as electricityApi,
  mess as messApi,
  suggestions as suggestionsApi,
  nightAttendance as nightAttendanceApi,
  floors as floorsApi
} from '../utils/api';
import DemandNotePrint from '../components/DemandNotePrint';
import PaymentGatewayModal from '../components/PaymentGatewayModal';
import {
  FileText,
  Zap,
  Coffee,
  MessageSquare,
  Moon,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
  RefreshCw,
  Plus,
  Send,
  UserCheck,
  Umbrella,
  ShieldCheck,
  CheckCheck,
  CreditCard
} from 'lucide-react';

const ModulesView = ({ defaultTab = 'reports' }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // ── Module 3: Reports State ──
  const [reportFloor, setReportFloor] = useState('combined');
  const [floorReportData, setFloorReportData] = useState(null);

  // ── Module 4: Electricity & Demand Notes State ──
  const [demandNotesList, setDemandNotesList] = useState([]);
  const [selectedDemandNote, setSelectedDemandNote] = useState(null);
  const [payingNote, setPayingNote] = useState(null);
  const [elecRoomId, setElecRoomId] = useState('101');
  const [elecPrev, setElecPrev] = useState('150');
  const [elecCurr, setElecCurr] = useState('210');
  const [elecMonth, setElecMonth] = useState('2026-08');

  // ── Module 5: Cook Dashboard & Mess Opt-Out State ──
  const [cookData, setCookData] = useState(null);
  const [optOutMealType, setOptOutMealType] = useState('DINNER');

  // ── Module 6: Suggestions State ──
  const [suggestionsList, setSuggestionsList] = useState([]);
  const [newSuggestion, setNewSuggestion] = useState('');

  // ── Module 10: TT Style Night Attendance State ──
  const [nightFloor, setNightFloor] = useState(user?.assignedFloor || 1);
  const [ttRoomsChart, setTtRoomsChart] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [notifyParents, setNotifyParents] = useState(true);
  const [nightSummary, setNightSummary] = useState({ total: 0, present: 0, absent: 0, onLeave: 0 });

  useEffect(() => {
    fetchTabData();
  }, [activeTab, reportFloor, nightFloor]);

  const fetchTabData = async () => {
    setLoading(true);
    setFeedbackMsg('');
    try {
      if (activeTab === 'reports') {
        if (reportFloor === 'combined') {
          const res = await floorsApi.getConsolidatedReport();
          setFloorReportData(res);
        } else {
          const res = await floorsApi.getFloorReport(reportFloor);
          setFloorReportData(res);
        }
      } else if (activeTab === 'demand-notes') {
        const dRes = await demandNotesApi.getAll();
        setDemandNotesList(Array.isArray(dRes) ? dRes : []);
      } else if (activeTab === 'cook-dashboard') {
        const cRes = await messApi.getCookDashboard();
        setCookData(cRes);
      } else if (activeTab === 'suggestions') {
        const sRes = await suggestionsApi.getAll();
        setSuggestionsList(Array.isArray(sRes) ? sRes : []);
      } else if (activeTab === 'night-attendance') {
        const attRes = await nightAttendanceApi.getByDate({ floorNumber: nightFloor });
        const rooms = attRes?.roomsChart || [];
        setTtRoomsChart(rooms);

        // Initialize state from existing logs & active leave flags
        const initialStatusObj = {};
        let p = 0, a = 0, l = 0, tot = 0;

        rooms.forEach(room => {
          room.students.forEach(student => {
            tot += 1;
            const currentStat = student.status || 'PRESENT';
            initialStatusObj[student.id] = currentStat;
            if (currentStat === 'PRESENT') p += 1;
            else if (currentStat === 'ABSENT') a += 1;
            else if (currentStat === 'ON_LEAVE') l += 1;
          });
        });

        setAttendanceRecords(initialStatusObj);
        setNightSummary({ total: tot, present: p, absent: a, onLeave: l });
      }
    } catch (err) {
      console.error('Error fetching tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Submit Sub-meter Reading
  const handleMeterSubmit = async (e) => {
    e.preventDefault();
    try {
      await electricityApi.submitReading({
        roomId: elecRoomId,
        readingMonth: elecMonth,
        previousReading: elecPrev,
        currentReading: elecCurr,
        ratePerUnit: 8.0
      });
      setFeedbackMsg('⚡ Electricity reading recorded successfully!');
      fetchTabData();
    } catch (err) {
      setFeedbackMsg('❌ Failed to record reading: ' + (err.message || 'Error'));
    }
  };

  // Generate Demand Notes
  const handleGenerateDemandNotes = async () => {
    try {
      const res = await demandNotesApi.generate('2026-08', user?.assignedFloor);
      setFeedbackMsg(`🧾 ${res.message}`);
      fetchTabData();
    } catch (err) {
      setFeedbackMsg('❌ Failed to generate demand notes.');
    }
  };

  // Student Opt-Out
  const handleOptOutSubmit = async () => {
    try {
      await messApi.optOutMeal({ mealType: optOutMealType });
      setFeedbackMsg(`🍽️ Opted out of ${optOutMealType} successfully!`);
      fetchTabData();
    } catch (err) {
      setFeedbackMsg('❌ ' + (err.message || 'Opt-out failed'));
    }
  };

  // Submit Suggestion
  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    if (!newSuggestion.trim()) return;
    try {
      await suggestionsApi.create(newSuggestion);
      setNewSuggestion('');
      setFeedbackMsg('💬 Thank you! Your suggestion has been submitted.');
      fetchTabData();
    } catch (err) {
      setFeedbackMsg('❌ Failed to submit suggestion.');
    }
  };

  // Train TT 1-Tap Toggle Handler
  const setStudentStatus = (studentId, newStatus) => {
    setAttendanceRecords(prev => {
      const nextObj = { ...prev, [studentId]: newStatus };
      // Recalculate summary metrics dynamically
      let p = 0, a = 0, l = 0, tot = 0;
      Object.keys(nextObj).forEach(id => {
        tot += 1;
        if (nextObj[id] === 'PRESENT') p += 1;
        else if (nextObj[id] === 'ABSENT') a += 1;
        else if (nextObj[id] === 'ON_LEAVE') l += 1;
      });
      setNightSummary({ total: tot, present: p, absent: a, onLeave: l });
      return nextObj;
    });
  };

  // Train TT Master Fast Check: Mark All Remaining as Present
  const markAllRemainingPresent = () => {
    const updatedObj = { ...attendanceRecords };
    ttRoomsChart.forEach(room => {
      room.students.forEach(student => {
        if (!student.hasActiveLeave && updatedObj[student.id] !== 'ABSENT') {
          updatedObj[student.id] = 'PRESENT';
        }
      });
    });
    setAttendanceRecords(updatedObj);

    let p = 0, a = 0, l = 0, tot = 0;
    Object.keys(updatedObj).forEach(id => {
      tot += 1;
      if (updatedObj[id] === 'PRESENT') p += 1;
      else if (updatedObj[id] === 'ABSENT') a += 1;
      else if (updatedObj[id] === 'ON_LEAVE') l += 1;
    });
    setNightSummary({ total: tot, present: p, absent: a, onLeave: l });
    setFeedbackMsg('⚡ Marked all non-absent residents as PRESENT!');
  };

  // Submit Night Round
  const handleNightRoundSubmit = async () => {
    try {
      const recordsArray = Object.keys(attendanceRecords).map(sId => ({
        studentId: sId,
        status: attendanceRecords[sId]
      }));
      if (recordsArray.length === 0) {
        setFeedbackMsg('Please mark at least 1 student status before submitting.');
        return;
      }
      await nightAttendanceApi.submitBulk({
        floorNumber: nightFloor,
        records: recordsArray,
        notifyParents
      });
      setFeedbackMsg(`Night Roll Call submitted for Floor ${nightFloor}. Total residents verified: ${recordsArray.length}`);
      fetchTabData();
    } catch (err) {
      setFeedbackMsg('❌ Failed to submit night attendance round.');
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Hari Pushp PG Operations & Modules</h1>
          <p className="text-sm text-slate-500 font-medium">
            Financial Reports · Demand Notes · Cook Dashboard · Suggestions · Night Roll Call
          </p>
        </div>
        <button
          onClick={fetchTabData}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {feedbackMsg !== '' && (
        <div className="mb-6 p-4 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-between shadow-lg animate-fade-in">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg('')} className="text-white hover:text-indigo-200">✕</button>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex overflow-x-auto gap-2 mb-6 p-1.5 bg-slate-100 rounded-2xl custom-scrollbar">
        {[
          { id: 'reports', label: '📊 Financial Reports', icon: FileText },
          { id: 'demand-notes', label: '🧾 Demand Notes & Sub-meters', icon: Zap },
          { id: 'cook-dashboard', label: '🍽️ Cook Dashboard & Opt-Out', icon: Coffee },
          { id: 'suggestions', label: '💬 Suggestion Box', icon: MessageSquare },
          { id: 'night-attendance', label: 'Night Roll Call', icon: Moon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: FINANCIAL REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <Building2 size={20} className="text-indigo-600" />
            <span className="font-bold text-slate-700 text-sm">Select Company / Floor:</span>
            <select
              value={reportFloor}
              onChange={(e) => setReportFloor(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-800 text-sm focus:outline-none focus:border-indigo-600"
            >
              <option value="combined">🌐 Consolidated View (All 5 Floors + Meenakshi Catering)</option>
              <option value="1">Floor 1 – Rajken Enterprises (Hari Pushp Girls Hostel)</option>
              <option value="2">Floor 2 – Vandana Enterprises (Vandana Girls Hostel)</option>
              <option value="3">Floor 3 – Pushpa Enterprises (Pushpa Girls Hostel)</option>
              <option value="4">Floor 4 – Harish Chandra Enterprises (Harish Chandra Girls Hostel)</option>
              <option value="5">Floor 5 – Ramesh Enterprises (Ramesh Girls Hostel)</option>
            </select>
          </div>

          {floorReportData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-6 rounded-2xl shadow-lg">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">Total Residents</p>
                <h3 className="text-3xl font-black mt-1">
                  {floorReportData.summary?.totalStudents || floorReportData.totals?.totalStudents || 0}
                </h3>
              </div>
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-2xl shadow-lg">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">Total Collected</p>
                <h3 className="text-3xl font-black mt-1">
                  ₹{(floorReportData.summary?.totalPaid || floorReportData.totals?.totalCollected || 0).toLocaleString()}
                </h3>
              </div>
              <div className="bg-gradient-to-br from-rose-600 to-pink-700 text-white p-6 rounded-2xl shadow-lg">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-200">Total Outstanding Dues</p>
                <h3 className="text-3xl font-black mt-1">
                  ₹{(floorReportData.summary?.totalPending || floorReportData.totals?.totalPending || 0).toLocaleString()}
                </h3>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DEMAND NOTES & SUB-METERS */}
      {activeTab === 'demand-notes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Zap size={20} className="text-amber-500" />
                <span>Sub-meter Electricity Reading Entry</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4 font-medium">Record room sub-meter reading (Rate: ₹8.0 / unit)</p>
              <form onSubmit={handleMeterSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Room Number</label>
                    <input type="text" value={elecRoomId} onChange={e => setElecRoomId(e.target.value)} className="w-full px-3 py-2 border rounded-xl font-semibold" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Billing Month</label>
                    <input type="text" value={elecMonth} onChange={e => setElecMonth(e.target.value)} className="w-full px-3 py-2 border rounded-xl font-semibold" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Previous Reading</label>
                    <input type="number" value={elecPrev} onChange={e => setElecPrev(e.target.value)} className="w-full px-3 py-2 border rounded-xl font-semibold" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Current Reading</label>
                    <input type="number" value={elecCurr} onChange={e => setElecCurr(e.target.value)} className="w-full px-3 py-2 border rounded-xl font-semibold" required />
                  </div>
                </div>
                <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs font-bold flex justify-between">
                  <span>Calculated Units: {Math.max(0, parseFloat(elecCurr || 0) - parseFloat(elecPrev || 0))} units</span>
                  <span>Amount: ₹{Math.max(0, parseFloat(elecCurr || 0) - parseFloat(elecPrev || 0)) * 8}</span>
                </div>
                <button type="submit" className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all shadow-md">
                  Save Reading & Calculate Bill
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <FileText size={20} className="text-indigo-600" />
                  <span>10-to-10 Cycle Demand Note Generator</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4 font-medium">
                  Auto-generates Demand Notes for cycle (10th of month → 9th of next month). Includes Sharing Fee + Sub-meter Electricity + Meenakshi Catering (₹3,000).
                </p>
              </div>
              <button
                onClick={handleGenerateDemandNotes}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                <span>Generate Demand Notes for Active Residents</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-700">
              Active Demand Notes ({demandNotesList.length})
            </div>
            <div className="divide-y divide-slate-100">
              {demandNotesList.map(note => (
                <div key={note.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{note.companyName || 'Hostel Fee'}</span>
                    <h4 className="text-base font-extrabold text-slate-800">{note.student?.user?.name} · Roll: {note.student?.rollNumber}</h4>
                    <p className="text-xs text-slate-500">Hostel Fee: ₹{note.hostelFee} + Electricity: ₹{note.electricityAmount} + Mess: ₹{note.messFee}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-800">₹{note.totalAmount?.toLocaleString()}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${note.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {note.status}
                    </span>
                    <button
                      onClick={() => setSelectedDemandNote(note)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
                    >
                      View Receipt
                    </button>
                    {note.status !== 'PAID' && (
                      <>
                        <button
                          onClick={() => setPayingNote(note)}
                          className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold rounded-lg hover:brightness-110 transition-all flex items-center gap-1 shadow-sm"
                        >
                          <CreditCard size={14} />
                          <span>Pay Online</span>
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={async () => {
                              await demandNotesApi.markPaid(note.id);
                              fetchTabData();
                            }}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COOK DASHBOARD & MESS OPT-OUT */}
      {activeTab === 'cook-dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Coffee size={20} className="text-amber-500" />
                <span>Student Meal Opt-Out</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4 font-medium">Opt-out of upcoming meal to help prevent food wastage</p>
              <div className="flex gap-2 mb-4">
                {['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'].map(meal => (
                  <button
                    key={meal}
                    onClick={() => setOptOutMealType(meal)}
                    className={`flex-1 py-2 rounded-xl font-bold text-xs ${optOutMealType === meal ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {meal}
                  </button>
                ))}
              </div>
              <button onClick={handleOptOutSubmit} className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-md">
                Submit Meal Opt-Out
              </button>
            </div>

            {cookData && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Cook Kitchen Dashboard</h3>
                <p className="text-xs text-slate-500 mb-4">Total Active Residents: {cookData.totalEnrolledResidents}</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(cookData.expectedMealCounts || {}).map(meal => (
                    <div key={meal} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase">{meal}</p>
                      <p className="text-2xl font-black text-indigo-600 mt-1">{cookData.expectedMealCounts[meal]} Meals</p>
                      <p className="text-[11px] text-rose-500 font-semibold">{cookData.optOutCounts[meal]} Opted Out</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SUGGESTION BOX */}
      {activeTab === 'suggestions' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Submit Feedback / Suggestion</h3>
            <form onSubmit={handleSuggestionSubmit} className="space-y-3">
              <textarea
                value={newSuggestion}
                onChange={e => setNewSuggestion(e.target.value)}
                placeholder="Write your constructive feedback or hostel suggestion..."
                className="w-full p-3 border rounded-xl text-sm font-medium"
                rows={3}
                required
              />
              <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2">
                <Send size={14} />
                <span>Submit Suggestion</span>
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b font-bold text-sm text-slate-700">Suggestions Inbox ({suggestionsList.length})</div>
            <div className="divide-y divide-slate-100">
              {suggestionsList.map(item => (
                <div key={item.id} className="p-4 flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{item.student?.user?.name}</h4>
                    <p className="text-sm text-slate-600 mt-1 italic">"{item.content}"</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: NIGHT ROLL CALL */}
      {activeTab === 'night-attendance' && (
        <div className="space-y-5">
          {/* Top Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 text-sm">Floor:</span>
              {[1, 2, 3, 4, 5].map(f => (
                <button
                  key={f}
                  onClick={() => setNightFloor(f)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                    nightFloor === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Floor {f}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={markAllRemainingPresent}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 border border-emerald-200 transition-all"
              >
                <CheckCheck size={14} />
                <span>Mark All Present</span>
              </button>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={notifyParents}
                  onChange={e => setNotifyParents(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-slate-600">Notify Parents</span>
              </label>
            </div>
          </div>

          {/* Summary Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 p-4 rounded-xl">
              <p className="text-xs font-medium text-slate-500">Total</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{nightSummary.total}</h3>
            </div>
            <div className="bg-white border border-emerald-200 p-4 rounded-xl">
              <p className="text-xs font-medium text-emerald-600">Present</p>
              <h3 className="text-xl font-bold text-emerald-700 mt-1">{nightSummary.present}</h3>
            </div>
            <div className="bg-white border border-rose-200 p-4 rounded-xl">
              <p className="text-xs font-medium text-rose-600">Absent</p>
              <h3 className="text-xl font-bold text-rose-700 mt-1">{nightSummary.absent}</h3>
            </div>
            <div className="bg-white border border-amber-200 p-4 rounded-xl">
              <p className="text-xs font-medium text-amber-600">On Leave</p>
              <h3 className="text-xl font-bold text-amber-700 mt-1">{nightSummary.onLeave}</h3>
            </div>
          </div>

          {/* Room-by-Room Roll Call */}
          <div className="space-y-4">
            {ttRoomsChart.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 font-medium">
                No rooms or residents found on Floor {nightFloor}.
              </div>
            ) : (
              ttRoomsChart.map(room => (
                <div key={room.roomId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* Room Header */}
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Room {room.roomNumber}</h4>
                      <p className="text-xs text-slate-500">
                        {room.sharingType}-sharing · {room.studentsCount} resident(s)
                      </p>
                    </div>
                    <span className="text-xs font-medium text-slate-400">Floor {nightFloor}</span>
                  </div>

                  {/* Residents */}
                  <div className="divide-y divide-slate-100">
                    {room.students.map(student => {
                      const stId = student.id;
                      const currentStatus = attendanceRecords[stId] || student.status || 'PRESENT';

                      return (
                        <div
                          key={stId}
                          className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                        >
                          {/* Student Info */}
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-slate-800 text-sm">{student.name}</h5>
                                {student.hasActiveLeave && (
                                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
                                    On Leave (till {student.leaveInfo?.endDate})
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Roll: {student.rollNumber} · Parent: {student.parentContact}
                              </p>
                            </div>
                          </div>

                          {/* Status Buttons */}
                          <div className="flex items-center gap-2 w-full md:w-auto">
                            <button
                              onClick={() => setStudentStatus(stId, 'PRESENT')}
                              className={`flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                                currentStatus === 'PRESENT'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                            >
                              Present
                            </button>

                            <button
                              onClick={() => setStudentStatus(stId, 'ABSENT')}
                              className={`flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                                currentStatus === 'ABSENT'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-700'
                              }`}
                            >
                              Absent
                            </button>

                            <button
                              onClick={() => setStudentStatus(stId, 'ON_LEAVE')}
                              className={`flex-1 md:flex-none px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                                currentStatus === 'ON_LEAVE'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-700'
                              }`}
                            >
                              Leave
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Submit Bar */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Floor {nightFloor} Night Roll Call</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                {nightSummary.present} Present · {nightSummary.absent} Absent · {nightSummary.onLeave} On Leave
              </p>
            </div>
            <button
              onClick={handleNightRoundSubmit}
              className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <ShieldCheck size={16} />
              <span>Submit ({nightSummary.total} Residents)</span>
            </button>
          </div>
        </div>
      )}
      {/* Demand Note Print Modal */}
      {selectedDemandNote && (
        <DemandNotePrint note={selectedDemandNote} onClose={() => setSelectedDemandNote(null)} />
      )}

      {/* Payment Gateway Modal */}
      {payingNote && (
        <PaymentGatewayModal
          note={payingNote}
          onClose={() => setPayingNote(null)}
          onSuccess={() => {
            setPayingNote(null);
            fetchTabData();
          }}
        />
      )}
    </div>
  );
};

export default ModulesView;

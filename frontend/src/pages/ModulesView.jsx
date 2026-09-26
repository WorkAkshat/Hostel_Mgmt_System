import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  demandNotes as demandNotesApi,
  electricity as electricityApi,
  floors as floorsApi
} from '../utils/api';
import DemandNotePrint from '../components/DemandNotePrint';
import PaymentGatewayModal from '../components/PaymentGatewayModal';
import {
  FileText,
  Zap,
  Building2,
  RefreshCw,
  Plus,
  CreditCard
} from 'lucide-react';

const MODULE_TITLES = {
  'reports': { title: 'Financial reports', subtitle: 'Collections, dues and expenses by floor' },
  'demand-notes': { title: 'Demand notes & sub-meters', subtitle: 'Electricity readings and monthly demand notes' },
};

const ModulesView = ({ defaultTab = 'reports' }) => {
  const { user } = useAuth();
  const [activeTab] = useState(defaultTab);
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

  useEffect(() => {
    fetchTabData();
  }, [activeTab, reportFloor]);

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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page header — switching between modules is handled by the section tabs */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">{MODULE_TITLES[activeTab]?.title}</h1>
          <p className="page-subtitle">
            {MODULE_TITLES[activeTab]?.subtitle}
          </p>
        </div>
        <button onClick={fetchTabData} className="btn-secondary h-10 shrink-0">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {feedbackMsg !== '' && (
        <div className="mb-6 p-4 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-between shadow-lg animate-fade-in">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg('')} className="text-white hover:text-indigo-200">✕</button>
        </div>
      )}

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
              <option value="combined">🌐 Common Expenses View (All 5 Floors + Meenakshi Catering)</option>
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

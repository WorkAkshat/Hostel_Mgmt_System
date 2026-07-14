import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Calendar, Clock, UserCheck, ShieldAlert, LogOut } from 'lucide-react';
import CustomModal from '../components/CustomModal';

const MOCK_VISITORS = [
  {
    id: 'v1',
    name: 'Ramesh Kumar',
    relationship: 'Father',
    phone: '+91 98765 43210',
    checkInTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    checkOutTime: null,
    student: {
      rollNumber: '2024CS101',
      user: { name: 'Priya Sharma' }
    }
  },
  {
    id: 'v2',
    name: 'Sunita Verma',
    relationship: 'Mother',
    phone: '+91 91234 56789',
    checkInTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    checkOutTime: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    student: {
      rollNumber: '2024EC205',
      user: { name: 'Neha Verma' }
    }
  },
  {
    id: 'v3',
    name: 'Amit Patel',
    relationship: 'Local Guardian',
    phone: '+91 99887 76655',
    checkInTime: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    checkOutTime: null,
    student: {
      rollNumber: '2024IT312',
      user: { name: 'Sneha Patel' }
    }
  }
];

const Visitors = () => {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const location = useLocation();

  // Form state
  const [form, setForm] = useState({
    studentRollNumber: '', name: '', phone: '', relationship: 'Father'
  });
  const [formError, setFormError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const data = await api('/visitors');
      if (data && data.length > 0) {
        // Append MOCK_VISITORS to show more content as requested
        setVisitors([...data, ...MOCK_VISITORS.filter(m => !data.find(d => d.name === m.name))]);
      } else {
        setVisitors(MOCK_VISITORS);
      }
    } catch (error) {
      console.error('Error fetching visitors:', error);
      setVisitors(MOCK_VISITORS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  useEffect(() => {
    if (location.state?.action === 'add') {
      setIsAddModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      setActionLoading(true);
      await api('/visitors', {
        method: 'POST',
        body: form
      });
      setIsAddModalOpen(false);
      setForm({ studentRollNumber: '', name: '', phone: '', relationship: 'Father' });
      fetchVisitors();
    } catch (error) {
      setFormError(error.message || 'Failed to check-in visitor');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckout = async (id) => {
    if (window.confirm('Are you sure you want to log checkout for this visitor?')) {
      try {
        await api(`/visitors/${id}/checkout`, {
          method: 'PUT'
        });
        fetchVisitors();
      } catch (error) {
        alert(error.message || 'Failed to check-out visitor');
      }
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="page-header mb-0 sm:mb-0">
          <h1 className="page-title">Visitor Registry Log</h1>
          <p className="page-subtitle">Log new guest check-ins, associate hosts, and register departures.</p>
        </div>
        {(user.role === 'ADMIN' || user.role === 'STAFF') && (
          <button className="btn-primary shadow-sm" onClick={() => setIsAddModalOpen(true)}>
            <UserPlus size={18} />
            <span>Check-in Visitor</span>
          </button>
        )}
      </div>

      {/* Main Table / Mobile Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
          <div className="spinner"></div>
          <p className="text-slate-400 font-medium text-sm">Loading visitor registry...</p>
        </div>
      ) : visitors.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-slate-400 font-medium">No visitors registered in logs.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Mobile view - Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {visitors.map((visitor) => (
              <div 
                key={visitor.id} 
                className="glass-card p-5 shadow-sm flex flex-col gap-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-extrabold text-sm flex items-center justify-center border border-blue-100/60 shadow-sm shrink-0">
                      {visitor.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <h4 className="text-sm font-bold text-slate-800 truncate">{visitor.name}</h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{visitor.relationship}</span>
                    </div>
                  </div>
                  <span className={`badge shrink-0 ${
                    visitor.checkOutTime ? 'badge-success' : 'badge-warning'
                  }`}>
                    {visitor.checkOutTime ? 'Checked out' : 'checked in'}
                  </span>
                </div>

                <div className="h-[1px] bg-slate-100" />

                <div className="flex flex-col gap-2.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Contact:</span>
                    <span className="font-medium text-slate-700">{visitor.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Host Student:</span>
                    <span className="font-bold text-slate-700">{visitor.student?.user?.name} ({visitor.student?.rollNumber})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Check-In:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      <span>{new Date(visitor.checkInTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Check-Out:</span>
                    {visitor.checkOutTime ? (
                      <span className="font-medium flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        <span>{new Date(visitor.checkOutTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold">In Campus</span>
                    )}
                  </div>
                </div>

                {!visitor.checkOutTime && (user.role === 'ADMIN' || user.role === 'STAFF') && (
                  <button 
                    onClick={() => handleCheckout(visitor.id)}
                    className="btn-primary w-full justify-center mt-1"
                  >
                    <LogOut size={14} />
                    <span>Log Checkout</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Visitor Name</th>
                  <th>Relationship</th>
                  <th>Contact</th>
                  <th>Host Student</th>
                  <th>Check In Details</th>
                  <th>Check Out Details</th>
                  <th className="text-right">Operations</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((visitor) => (
                  <tr key={visitor.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 font-extrabold text-xs flex items-center justify-center border border-blue-100/60 shadow-sm shrink-0">
                          {visitor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-xs font-bold text-slate-800 leading-tight">{visitor.name}</h4>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Guest Entry</span>
                        </div>
                      </div>
                    </td>
                    <td><strong className="text-xs font-bold text-slate-700">{visitor.relationship}</strong></td>
                    <td className="text-xs font-medium text-slate-600">{visitor.phone}</td>
                    <td>
                      <div className="flex flex-col text-xs text-slate-600 leading-normal">
                        <span className="font-bold text-slate-800">{visitor.student?.user?.name}</span>
                        <code className="font-mono text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{visitor.student?.rollNumber}</code>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                        <Calendar size={12} className="text-slate-400" />
                        <span>{new Date(visitor.checkInTime).toLocaleDateString()}</span>
                        <Clock size={12} className="text-slate-400 ml-1.5" />
                        <span>{new Date(visitor.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td>
                      {visitor.checkOutTime ? (
                        <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{new Date(visitor.checkOutTime).toLocaleDateString()}</span>
                          <Clock size={12} className="text-slate-400 ml-1.5" />
                          <span>{new Date(visitor.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-bold text-xs">Still Checked In</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end">
                        {!visitor.checkOutTime ? (
                          (user.role === 'ADMIN' || user.role === 'STAFF') ? (
                            <button className="btn-primary h-9 px-3.5 text-xs font-bold shrink-0 animate-pulse" onClick={() => handleCheckout(visitor.id)}>
                              <LogOut size={14} /> <span>Log Checkout</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium italic">Active Guest</span>
                          )
                        ) : (
                          <div className="flex items-center gap-1 text-slate-400 text-xs font-bold bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                            <UserCheck size={12} />
                            <span>Departure Logged</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHECK-IN VISITOR MODAL */}
      <CustomModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Log Visitor Check-In">
        {formError && (
          <div className="flex items-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold mb-4 animate-fade-in">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group mb-0 full-width">
            <label className="form-label">Host Student Roll Number</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. 2024CS101"
              required
              value={form.studentRollNumber}
              onChange={(e) => setForm({...form, studentRollNumber: e.target.value})}
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Visitor Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              required
              placeholder="e.g. Ramesh Kumar"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Visitor Phone Number</label>
            <input 
              type="text" 
              className="form-input" 
              required
              placeholder="+91 XXXXX XXXXX"
              value={form.phone}
              onChange={(e) => setForm({...form, phone: e.target.value})}
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Relationship to Student</label>
            <select 
              className="form-input"
              value={form.relationship}
              onChange={(e) => setForm({...form, relationship: e.target.value})}
            >
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Brother">Brother</option>
              <option value="Sister">Sister</option>
              <option value="Guardian">Local Guardian</option>
              <option value="Friend">Friend</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-2 full-width">
            <button type="button" className="btn-secondary h-11 px-5" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary h-11 px-5" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Register Entry'}
            </button>
          </div>
        </form>
      </CustomModal>
    </div>
  );
};

export default Visitors;


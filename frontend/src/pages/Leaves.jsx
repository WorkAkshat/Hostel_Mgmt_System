import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle, XCircle, LogOut, LogIn, Clock, ShieldAlert, Fingerprint, Home, MapPin, Plane, ArrowLeft } from 'lucide-react';
import CustomModal from '../components/CustomModal';
import BiometricScanner from '../components/BiometricScanner';

const Leaves = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State (Student)
  const [form, setForm] = useState({
    startDate: '', endDate: '', type: 'NIGHT_OUT', reason: ''
  });
  const [formError, setFormError] = useState(null);

  // Biometric Modal State
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);

  // Comment Modal State (Warden Approval/Rejection)
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionType, setActionType] = useState(''); // 'APPROVED' or 'REJECTED'
  const [comments, setComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      if (user.role === 'ADMIN' || user.role === 'STAFF') {
        const data = await api('/leaves');
        setLeaves(data);
      } else {
        const data = await api('/leaves/my-leaves');
        setLeaves(data);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [user]);

  // Handle student leave submission
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (new Date(form.startDate) >= new Date(form.endDate)) {
        setFormError('End Date must be after Start Date.');
        return;
      }

      await api('/leaves', {
        method: 'POST',
        body: form
      });
      setForm({ startDate: '', endDate: '', type: 'NIGHT_OUT', reason: '' });
      fetchLeaves();
      alert('Leave request submitted successfully. Awaiting Warden approval.');
    } catch (error) {
      setFormError(error.message || 'Failed to submit leave request');
    }
  };

  // Open comments dialog for Warden
  const openWardenActionModal = (leave, action) => {
    setSelectedLeave(leave);
    setActionType(action);
    setComments('');
    setIsCommentModalOpen(true);
  };

  // Submit warden status approval
  const handleWardenActionSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api(`/leaves/${selectedLeave.id}/status`, {
        method: 'PUT',
        body: {
          status: actionType,
          comments
        }
      });
      setIsCommentModalOpen(false);
      fetchLeaves();
    } catch (error) {
      alert(error.message || 'Failed to process leave action');
    } finally {
      setActionLoading(false);
    }
  };

  // Log exit gate checkout timestamp (Security Guard / Warden)
  const handleLogCheckout = async (id) => {
    if (window.confirm('Confirm student checkout departure at the security gate?')) {
      try {
        await api(`/leaves/${id}/checkout`, {
          method: 'PUT'
        });
        fetchLeaves();
      } catch (error) {
        alert(error.message || 'Failed to log gate check-out');
      }
    }
  };

  // Log return gate checkin timestamp (Security Guard / Warden)
  const handleLogCheckin = async (id) => {
    if (window.confirm('Confirm student check-in return arrival at the security gate?')) {
      try {
        await api(`/leaves/${id}/checkin`, {
          method: 'PUT'
        });
        fetchLeaves();
      } catch (error) {
        alert(error.message || 'Failed to log gate check-in');
      }
    }
  };

  // Biometric scanner responses
  const handleBiometricSuccess = (data) => {
    alert(data.message || 'Biometric check successful!');
    setIsBiometricModalOpen(false);
    fetchLeaves();
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6 text-left">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        {/* <button 
          onClick={() => navigate(user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'STUDENT' ? '/student/dashboard' : '/staff/visitors')} 
          className="bg-slate-50 border border-slate-200/60 text-slate-500 hover:text-slate-900 cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={16} />
        </button> */}
        <div className="page-header mb-0 sm:mb-0">
          <h1 className="page-title leading-tight">
            {user.role === 'ADMIN' ? 'Leave & Gate Pass Approvals' : user.role === 'STAFF' ? 'Gate Security Log' : 'Apply Leave'}
          </h1>
          <p className="page-subtitle mb-0 mt-1">
            {user.role === 'ADMIN' ? 'Approve or reject leave applications and monitor campus check-ins.' :
             user.role === 'STAFF' ? 'Register exit check-outs and check-in arrivals for hostel residents.' :
             'GHMS out/in leave pass control system'}
          </p>
        </div>
      </div>

      {/* Grid Layout depending on user role */}
      {user.role === 'STUDENT' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Submit form on left */}
          <div className="flex flex-col gap-6">
            <div className="glass-card p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Leave Request</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Submit your details for Warden approval</p>
              </div>
              
              {formError && (
                <div className="flex items-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold mb-4 animate-fade-in">
                  <ShieldAlert size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleStudentSubmit} className="form-grid">
                {/* Leave Type Select Grid */}
                <div className="form-group mb-2 full-width">
                  <label className="form-label">Leave Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'OUT_OF_STATION' })}
                      className={`py-3.5 px-4 border rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 ${
                        form.type === 'OUT_OF_STATION' 
                          ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm font-bold' 
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Home size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'NIGHT_OUT' })}
                      className={`py-3.5 px-4 border rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 ${
                        form.type === 'NIGHT_OUT' 
                          ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm font-bold' 
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <MapPin size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Local</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'EMERGENCY' })}
                      className={`py-3.5 px-4 border rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 ${
                        form.type === 'EMERGENCY' 
                          ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm font-bold' 
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Plane size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Vacation</span>
                    </button>
                  </div>
                </div>

                {/* Start and End Dates Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 full-width">
                  <div className="form-group mb-0">
                    <label className="form-label">Departure Date & Time</label>
                    <input 
                      type="datetime-local" 
                      className="form-input text-xs font-semibold" 
                      required
                      value={form.startDate}
                      onChange={(e) => setForm({...form, startDate: e.target.value})}
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">Return Date & Time</label>
                    <input 
                      type="datetime-local" 
                      className="form-input text-xs font-semibold" 
                      required
                      value={form.endDate}
                      onChange={(e) => setForm({...form, endDate: e.target.value})}
                    />
                  </div>
                </div>

                {/* Reason for Leave */}
                <div className="form-group mb-0 full-width">
                  <label className="form-label">Reason for Leave</label>
                  <textarea 
                    className="form-input h-20 py-2.5" 
                    required
                    placeholder="Specify the formal reason for your leave request..."
                    value={form.reason}
                    onChange={(e) => setForm({...form, reason: e.target.value})}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Disclaimer note */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex gap-2.5 items-start full-width">
                  <Clock size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-900 leading-relaxed font-semibold">
                    By submitting, you agree to return to the hostel by 8:00 PM on the end date specified. Any delay must be informed.
                  </p>
                </div>

                <div className="full-width">
                  <button type="submit" className="btn-primary w-full justify-center">
                    <span>Submit Request</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Biometric Gate Trigger Card */}
            <div className="glass-card p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Fingerprint size={20} className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Gate Biometric Scanner</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed font-medium">
                Your checkout and check-in times at the gate are automatically updated on this dashboard via the physical fingerprint devices installed at the main entrance.
              </p>
              <button 
                onClick={() => setIsBiometricModalOpen(true)}
                className="w-full h-10 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all bg-white"
              >
                <Fingerprint size={14} />
                <span>Simulate Gate Fingerprint Scan</span>
              </button>
            </div>
          </div>

          {/* Leave history on right */}
          <div className="glass-card p-6 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5">My Leave History</h3>
            {loading ? (
              <p className="text-slate-400 font-medium text-center py-12 text-sm">Loading history log...</p>
            ) : leaves.length === 0 ? (
              <p className="text-slate-400 font-medium text-center py-12 text-sm">No leaves filed yet.</p>
            ) : (
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[560px] pr-2">
                {leaves.map((leave) => (
                  <div key={leave.id} className="p-4 border border-slate-200/80 rounded-2xl flex flex-col gap-3 hover:border-slate-300 transition-all bg-white text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{leave.type.replace('_', ' ')}</span>
                      <span className={`badge ${
                        leave.status === 'APPROVED' ? 'badge-success' :
                        leave.status === 'PENDING' ? 'badge-warning' :
                        leave.status === 'REJECTED' ? 'badge-danger' : 'badge-info'
                      }`}>
                        {leave.status.toLowerCase()}
                      </span>
                    </div>
                    
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarDays size={14} />
                      <span>{new Date(leave.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} - {new Date(leave.endDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">Reason: {leave.reason}</p>
                    
                    {leave.comments && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] text-slate-600">
                        <strong className="font-bold text-slate-700">Warden Note:</strong> {leave.comments} (By: {leave.approvedBy})
                      </div>
                    )}
                    
                    {(leave.checkOutTime || leave.checkInTime) && (
                      <div className="flex flex-col gap-1 border-t border-slate-50 pt-2 text-[10px]">
                        {leave.checkOutTime && (
                          <p className="text-emerald-600 font-bold flex items-center gap-1">
                            <LogOut size={12} /> Biometric Gate Out: {new Date(leave.checkOutTime).toLocaleString()}
                          </p>
                        )}
                        {leave.checkInTime && (
                          <p className="text-emerald-600 font-bold flex items-center gap-1">
                            <LogIn size={12} /> Biometric Gate In: {new Date(leave.checkInTime).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* WARDEN & SECURITY PORTAL VIEW */
        <div className="glass-card p-6 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5">Active Leave Registers</h3>
          
          {loading ? (
            <div className="min-h-[30vh] flex flex-col items-center justify-center gap-4">
              <div className="spinner"></div>
              <p className="text-slate-400 font-medium text-sm">Loading leave records...</p>
            </div>
          ) : leaves.length === 0 ? (
            <p className="text-center py-12 text-slate-400 text-sm">No requests in the queue.</p>
          ) : (
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Student Info</th>
                    <th>Roll / Room</th>
                    <th>Duration Dates</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 font-extrabold text-xs flex items-center justify-center border border-blue-100/60 shadow-sm shrink-0">
                            {leave.student?.user?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <h4 className="text-xs font-bold text-slate-800 truncate">{leave.student?.user?.name}</h4>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{leave.type.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col text-slate-600 text-xs">
                          <code className="font-mono font-semibold text-slate-700">{leave.student?.rollNumber}</code>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Room {leave.student?.room?.roomNumber || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col text-slate-600 text-xs">
                          <span><strong>Out:</strong> {new Date(leave.startDate).toLocaleDateString()} {new Date(leave.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="mt-0.5"><strong>In:</strong> {new Date(leave.endDate).toLocaleDateString()} {new Date(leave.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-slate-500 font-medium max-w-[200px] inline-block truncate" title={leave.reason}>
                          {leave.reason}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          leave.status === 'APPROVED' ? 'badge-success' :
                          leave.status === 'PENDING' ? 'badge-warning' :
                          leave.status === 'REJECTED' ? 'badge-danger' : 'badge-info'
                        }`}>
                          {leave.status.toLowerCase()}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          {leave.status === 'PENDING' && user.role === 'ADMIN' && (
                            <>
                              <button 
                                className="btn-primary h-9 px-3.5 text-xs font-bold shrink-0"
                                onClick={() => openWardenActionModal(leave, 'APPROVED')}
                              >
                                <CheckCircle size={14} /> <span>Approve</span>
                              </button>
                              <button 
                                className="btn-secondary h-9 px-3.5 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                                onClick={() => openWardenActionModal(leave, 'REJECTED')}
                              >
                                <XCircle size={14} /> <span>Reject</span>
                              </button>
                            </>
                          )}
                          
                          {leave.status === 'APPROVED' && (
                            <button 
                              className="btn-primary h-9 px-3.5 text-xs font-bold shrink-0"
                              onClick={() => handleLogCheckout(leave.id)}
                            >
                              <LogOut size={14} /> <span>Log Gate Out</span>
                            </button>
                          )}

                          {leave.status === 'CHECKED_OUT' && (
                            <button 
                              className="btn-primary h-9 px-3.5 text-xs font-bold shrink-0 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleLogCheckin(leave.id)}
                            >
                              <LogIn size={14} /> <span>Log Gate In</span>
                            </button>
                          )}

                          {leave.status === 'RETURNED' && (
                            <span className="text-[11px] text-emerald-600 font-extrabold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                              Returned (Gate scan)
                            </span>
                          )}
                          {leave.status === 'REJECTED' && (
                            <span className="text-[11px] text-red-500 font-extrabold bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                              Rejected
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* BIOMETRIC SIMULATION SCANNER POPUP */}
      <CustomModal isOpen={isBiometricModalOpen} onClose={() => setIsBiometricModalOpen(false)} title="Biometric Gate Terminal">
        <div className="py-2">
          <BiometricScanner 
            rollNumber={user.studentDetails?.rollNumber}
            endpoint="/leaves/biometric-verify"
            onSuccess={handleBiometricSuccess}
          />
        </div>
      </CustomModal>

      {/* WARDEN COMMENTS COMMENT MODAL */}
      <CustomModal 
        isOpen={isCommentModalOpen} 
        onClose={() => setIsCommentModalOpen(false)} 
        title={`${actionType === 'APPROVED' ? 'Approve' : 'Reject'} Leave Request`}
      >
        <form onSubmit={handleWardenActionSubmit} className="form-grid">
          <div className="form-group mb-0 full-width">
            <label className="form-label">Review Notes / Warden Comments</label>
            <textarea 
              className="form-input h-24 py-2.5" 
              placeholder="Provide official review remarks or reason for rejection..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              required={actionType === 'REJECTED'}
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 full-width">
            <button type="button" className="btn-secondary h-11 px-5" onClick={() => setIsCommentModalOpen(false)}>Cancel</button>
            <button 
              type="submit" 
              className="btn-primary h-11 px-5"
              style={actionType === 'REJECTED' ? { background: 'var(--danger)' } : {}}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : `${actionType === 'APPROVED' ? 'Approve Pass' : 'Reject Request'}`}
            </button>
          </div>
        </form>
      </CustomModal>
    </div>
  );
};

export default Leaves;


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
    <div className="animate-fade-in space-y-6">
      {/* Mobile/Desktop Header with Back Navigation */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/student/dashboard')} className="bg-transparent border-none text-gray-500 hover:text-gray-900 cursor-pointer p-1 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="page-title text-base lg:text-lg font-bold text-[#0b1a52] leading-none mb-1">
            {user.role === 'ADMIN' ? 'Leave & Gate Pass Approvals' : user.role === 'STAFF' ? 'Gate Security Log' : 'Apply Leave'}
          </h1>
          <p className="text-[11px] text-gray-400">
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
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-sm font-bold text-[#0b1a52]">Leave Request</h3>
                <p className="text-xs text-gray-400 mt-0.5">Submit your details for approval</p>
              </div>
              
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                  <ShieldAlert size={14} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleStudentSubmit} className="space-y-4">
                {/* Leave Type Select Grid */}
                <div className="form-group">
                  <label className="form-label text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Leave Type</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'OUT_OF_STATION' })}
                      className={`flex-1 py-3 px-4 border rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 ${
                        form.type === 'OUT_OF_STATION' 
                          ? 'border-[#0b1a52] bg-[#0b1a52] text-white shadow-sm font-bold' 
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Home size={18} />
                      <span className="text-[11px]">Home</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'NIGHT_OUT' })}
                      className={`flex-1 py-3 px-4 border rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 ${
                        form.type === 'NIGHT_OUT' 
                          ? 'border-[#0b1a52] bg-[#0b1a52] text-white shadow-sm font-bold' 
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <MapPin size={18} />
                      <span className="text-[11px]">Local</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'EMERGENCY' })}
                      className={`flex-1 py-3 px-4 border rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 ${
                        form.type === 'EMERGENCY' 
                          ? 'border-[#0b1a52] bg-[#0b1a52] text-white shadow-sm font-bold' 
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Plane size={18} />
                      <span className="text-[11px]">Vacation</span>
                    </button>
                  </div>
                </div>

                {/* Start and End Dates Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Start Date</label>
                    <input 
                      type="datetime-local" 
                      className="form-input rounded-xl border-gray-200 text-xs py-2 px-3" 
                      required
                      value={form.startDate}
                      onChange={(e) => setForm({...form, startDate: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">End Date</label>
                    <input 
                      type="datetime-local" 
                      className="form-input rounded-xl border-gray-200 text-xs py-2 px-3" 
                      required
                      value={form.endDate}
                      onChange={(e) => setForm({...form, endDate: e.target.value})}
                    />
                  </div>
                </div>

                {/* Reason for Leave */}
                <div className="form-group">
                  <label className="form-label text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Reason for Leave</label>
                  <textarea 
                    className="form-input rounded-xl border-gray-200 text-xs" 
                    rows="3" 
                    required
                    placeholder="Explain your reason for taking leave..."
                    value={form.reason}
                    onChange={(e) => setForm({...form, reason: e.target.value})}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Parent Contact */}
                <div className="form-group">
                  <label className="form-label text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Parent's Contact Number</label>
                  <input 
                    type="text" 
                    className="form-input rounded-xl border-gray-200 text-xs py-2 px-3" 
                    required
                    placeholder="+91 00000 00000"
                  />
                </div>

                {/* Disclaimer note */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex gap-2.5 items-start">
                  <Clock size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-900 leading-relaxed font-semibold">
                    By submitting, you agree to return to the hostel by 8:00 PM on the end date specified. Any delay must be informed.
                  </p>
                </div>

                <button type="submit" className="btn-primary w-full py-3 justify-center rounded-xl bg-[#0b1a52] hover:bg-[#16276b] font-bold text-sm border-none">
                  <span>Submit Request</span>
                </button>
              </form>
            </div>

            {/* Biometric Gate Terminal Info */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#0b1a52]">Gate Biometric System</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Your checkout and check-in times at the gate are automatically updated on this dashboard via the physical fingerprint devices installed at the main entrance.
              </p>
            </div>
          </div>

          {/* Leave history on right */}
          <div className="glass-card" style={styles.card}>
            <h3 style={styles.cardTitle}>My Leave History</h3>
            {loading ? (
              <p style={styles.loadingText}>Loading history log...</p>
            ) : leaves.length === 0 ? (
              <p style={styles.emptyText}>No leaves filed yet.</p>
            ) : (
              <div style={styles.leavesTimeline}>
                {leaves.map((leave) => (
                  <div key={leave.id} style={styles.timelineItem} className="glass-card">
                    <div style={styles.timelineHeader}>
                      <span style={styles.timelineType}>{leave.type.replace('_', ' ')}</span>
                      <span className={`badge ${
                        leave.status === 'APPROVED' ? 'badge-success' :
                        leave.status === 'PENDING' ? 'badge-warning' :
                        leave.status === 'REJECTED' ? 'badge-danger' : 'badge-info'
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                    
                    <p style={styles.timelineMeta}>
                      {new Date(leave.startDate).toLocaleString()} to {new Date(leave.endDate).toLocaleString()}
                    </p>
                    <p style={styles.timelineReason}>Reason: {leave.reason}</p>
                    
                    {leave.comments && (
                      <div style={styles.wardenComments}>
                        <strong>Warden Note:</strong> {leave.comments} (Warden: {leave.approvedBy})
                      </div>
                    )}
                    
                    {leave.checkOutTime && (
                      <p style={styles.gateStamp}>
                        <LogOut size={12} /> Biometric Gate Out: {new Date(leave.checkOutTime).toLocaleString()}
                      </p>
                    )}
                    {leave.checkInTime && (
                      <p style={styles.gateStamp}>
                        <LogIn size={12} /> Biometric Gate In: {new Date(leave.checkInTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* WARDEN & SECURITY PORTAL VIEW */
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={styles.cardTitle}>Active Leave Registers</h3>
          
          {loading ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading leaves...</p>
          ) : leaves.length === 0 ? (
            <p style={styles.emptyText}>No requests in the queue.</p>
          ) : (
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Student Info</th>
                    <th>Roll Number / Room</th>
                    <th>Duration Dates</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>
                        <div style={styles.studentCell}>
                          <div style={styles.avatarMini}>
                            {leave.student?.user?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 style={styles.studentCellName}>{leave.student?.user?.name}</h4>
                            <span style={styles.studentCellType}>{leave.type.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={styles.rollCell}>
                          <code>{leave.student?.rollNumber}</code>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Room {leave.student?.room?.roomNumber || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={styles.dateCell}>
                          <span><strong>Out:</strong> {new Date(leave.startDate).toLocaleDateString()} {new Date(leave.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span><strong>In:</strong> {new Date(leave.endDate).toLocaleDateString()} {new Date(leave.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td><span style={styles.tableReason} title={leave.reason}>{leave.reason}</span></td>
                      <td>
                        <span className={`badge ${
                          leave.status === 'APPROVED' ? 'badge-success' :
                          leave.status === 'PENDING' ? 'badge-warning' :
                          leave.status === 'REJECTED' ? 'badge-danger' : 'badge-info'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                      <td>
                        <div style={styles.actionBtnsContainer}>
                          {leave.status === 'PENDING' && user.role === 'ADMIN' && (
                            <>
                              <button 
                                className="btn-primary" 
                                style={styles.approveBtn} 
                                onClick={() => openWardenActionModal(leave, 'APPROVED')}
                              >
                                <CheckCircle size={14} /> Approve
                              </button>
                              <button 
                                className="btn-secondary" 
                                style={styles.rejectBtn}
                                onClick={() => openWardenActionModal(leave, 'REJECTED')}
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            </>
                          )}
                          
                          {leave.status === 'APPROVED' && (
                            <button 
                              className="btn-primary" 
                              style={styles.gateBtn}
                              onClick={() => handleLogCheckout(leave.id)}
                            >
                              <LogOut size={14} /> Log Gate Out
                            </button>
                          )}

                          {leave.status === 'CHECKED_OUT' && (
                            <button 
                              className="btn-success" 
                              style={styles.gateBtnCheckin}
                              onClick={() => handleLogCheckin(leave.id)}
                            >
                              <LogIn size={14} /> Log Gate In
                            </button>
                          )}

                          {leave.status === 'RETURNED' && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: '500' }}>
                              Returned (Gate scan)
                            </span>
                          )}
                          {leave.status === 'REJECTED' && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: '500' }}>
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
        <div style={{ padding: '1rem 0' }}>
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
        <form onSubmit={handleWardenActionSubmit} style={styles.modalForm}>
          <div className="form-group">
            <label className="form-label">Review Notes / Warden Comments</label>
            <textarea 
              className="form-input" 
              rows="4" 
              placeholder="Comments..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              required={actionType === 'REJECTED'}
            />
          </div>
          <div style={styles.modalActions}>
            <button type="button" className="btn-secondary" onClick={() => setIsCommentModalOpen(false)}>Cancel</button>
            <button 
              type="submit" 
              className="btn-primary"
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

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '2.5rem',
  },
  card: {
    padding: '1.75rem',
  },
  biometricTriggerCard: {
    padding: '1.5rem',
    background: 'linear-gradient(135deg, rgba(236,72,153,0.06) 0%, rgba(139,92,246,0.02) 100%)',
    border: '1px solid rgba(236,72,153,0.12)',
  },
  biometricInstruction: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    margin: '0.5rem 0 1.25rem 0',
  },
  biometricVerifyBtn: {
    width: '100%',
    justifyContent: 'center',
    background: 'var(--accent-gradient)',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '1.25rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    color: 'var(--danger)',
    fontSize: '0.8rem',
    marginBottom: '1.25rem',
  },
  loadingText: {
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: '2rem 0',
  },
  emptyText: {
    color: 'var(--text-tertiary)',
    textAlign: 'center',
    padding: '3rem 0',
    fontSize: '0.85rem',
  },
  leavesTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxHeight: '520px',
    overflowY: 'auto',
    paddingRight: '0.25rem',
  },
  timelineItem: {
    padding: '1rem',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineType: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
  },
  timelineMeta: {
    fontSize: '0.75rem',
    color: 'var(--accent)',
    fontWeight: '500',
  },
  timelineReason: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  wardenComments: {
    background: 'var(--accent-light)',
    border: '1px solid rgba(236,72,153,0.1)',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    color: 'var(--text-primary)',
    marginTop: '0.25rem',
  },
  gateStamp: {
    fontSize: '0.75rem',
    color: 'var(--success)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontWeight: '500',
  },
  studentCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatarMini: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
  },
  studentCellName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  studentCellType: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  rollCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  dateCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  },
  tableReason: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    maxWidth: '220px',
    display: 'inline-block',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  actionBtnsContainer: {
    display: 'flex',
    gap: '0.4rem',
  },
  approveBtn: {
    padding: '0.4rem 0.75rem',
    fontSize: '0.75rem',
  },
  rejectBtn: {
    padding: '0.4rem 0.75rem',
    fontSize: '0.75rem',
    color: 'var(--danger)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  gateBtn: {
    padding: '0.4rem 0.75rem',
    fontSize: '0.75rem',
    width: '100%',
    justifyContent: 'center',
  },
  gateBtnCheckin: {
    padding: '0.4rem 0.75rem',
    fontSize: '0.75rem',
    background: 'var(--success-bg)',
    color: 'var(--success)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    cursor: 'pointer',
    borderRadius: 'var(--border-radius-sm)',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    width: '100%',
    justifyContent: 'center',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
  }
};

export default Leaves;

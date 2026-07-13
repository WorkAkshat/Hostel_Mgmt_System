import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Wrench, ShieldAlert, CheckCircle, Clock, AlertTriangle, AlertCircle, ArrowLeft } from 'lucide-react';
import CustomModal from '../components/CustomModal';

const Complaints = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State (Student)
  const [form, setForm] = useState({
    category: 'Electrical', description: '', priority: 'MEDIUM'
  });
  const [formError, setFormError] = useState(null);

  // Status Action Modal State (Warden)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [status, setStatus] = useState('PENDING');
  const [wardenNotes, setWardenNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      if (user.role === 'ADMIN') {
        const data = await api('/complaints');
        setComplaints(data);
      } else {
        const data = await api('/complaints/my-complaints');
        setComplaints(data);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [user]);

  // Handle student complaint filing
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      await api('/complaints', {
        method: 'POST',
        body: form
      });
      setForm({ category: 'Electrical', description: '', priority: 'MEDIUM' });
      fetchComplaints();
      alert('Complaint ticket submitted successfully to Warden Office.');
    } catch (error) {
      setFormError(error.message || 'Failed to submit complaint');
    }
  };

  // Open warden actions popup
  const openWardenActionModal = (complaint) => {
    setSelectedComplaint(complaint);
    setStatus(complaint.status);
    setWardenNotes(complaint.wardenNotes || '');
    setIsActionModalOpen(true);
  };

  // Process warden ticket modifications
  const handleWardenActionSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api(`/complaints/${selectedComplaint.id}`, {
        method: 'PUT',
        body: {
          status,
          wardenNotes
        }
      });
      setIsActionModalOpen(false);
      fetchComplaints();
    } catch (error) {
      alert(error.message || 'Failed to update complaint ticket');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Mobile/Desktop Header with Back Navigation */}
      <div className="flex items-center gap-3">
        {user.role === 'STUDENT' && (
          <button onClick={() => navigate('/student/dashboard')} className="bg-transparent border-none text-gray-500 hover:text-gray-900 cursor-pointer p-1 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center shrink-0">
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="page-title text-base lg:text-lg font-bold text-[#0b1a52] leading-none mb-1">
            {user.role === 'ADMIN' ? 'Maintenance Helpdesk' : 'Raise Complaint'}
          </h1>
          <p className="text-[11px] text-gray-400">
            {user.role === 'ADMIN' ? 'Manage hostel issues, assign support staff, and log resolution feedback.' :
             'GHMS hostellers asset repair and support ticketing helpline'}
          </p>
        </div>
      </div>

      {/* Grid Layout depending on user role */}
      {user.role === 'STUDENT' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Submit form on left */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-bold text-[#0b1a52]">Raise Repair Complaint</h3>
              <p className="text-xs text-gray-400 mt-0.5">Submit asset issues for maintenance team dispatch</p>
            </div>
            
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl flex items-center gap-2">
                <ShieldAlert size={14} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div className="form-group">
                <label className="form-label text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category of Issue</label>
                <select 
                  className="form-input rounded-xl border-gray-200 text-xs py-2 px-3 bg-white"
                  value={form.category}
                  onChange={(e) => setForm({...form, category: e.target.value})}
                >
                  <option value="Electrical">Electrical (Fan, Tube light, Socket)</option>
                  <option value="Plumbing">Plumbing (Tap leakage, Clogged drain)</option>
                  <option value="HVAC">AC & Ventilation (Cooling issues)</option>
                  <option value="Wi-Fi">Wi-Fi & Internet Connectivity</option>
                  <option value="Structural">Carpentry & Furniture (Latch, Bed, Desk)</option>
                  <option value="Others">Others (General Maintenance)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Urgency Priority</label>
                <div className="flex gap-2">
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, priority: p })}
                      className={`flex-1 py-2 px-1 border rounded-lg text-center cursor-pointer transition-all duration-200 text-[10px] sm:text-xs font-bold leading-none ${
                        form.priority === p 
                          ? 'border-[#0b1a52] bg-[#0b1a52] text-white shadow-sm' 
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Describe the Issue</label>
                <textarea 
                  className="form-input rounded-xl border-gray-200 text-xs py-2 px-3" 
                  rows="4" 
                  required
                  placeholder="Describe details (e.g. Fan regulator broken, water leaking)..."
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn-primary w-full py-3 justify-center rounded-xl bg-[#0b1a52] hover:bg-[#16276b] font-bold text-sm border-none">
                <Wrench size={16} />
                <span>Raise Complaint</span>
              </button>
            </form>
          </div>

          {/* Ticket history on right */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-bold text-[#0b1a52]">My Ticket History</h3>
              <p className="text-xs text-gray-400 mt-0.5">Track status updates of filed requests</p>
            </div>
            
            {loading ? (
              <p className="text-xs text-gray-400 text-center py-6">Loading history log...</p>
            ) : complaints.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No complaints raised yet.</p>
            ) : (
              <div className="space-y-4">
                {complaints.map((c) => (
                  <div key={c.id} className="border border-gray-100 rounded-xl p-4 bg-slate-50/50 flex flex-col gap-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#0b1a52]">{c.category}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                        c.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-[11px] text-gray-500">
                      <span>Priority:</span>
                      <span className={`font-bold ${
                        c.priority === 'URGENT' ? 'text-red-600 font-extrabold' :
                        c.priority === 'HIGH' ? 'text-amber-600' :
                        c.priority === 'MEDIUM' ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {c.priority}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed bg-white border border-gray-100/50 p-2.5 rounded-lg">{c.description}</p>
                    
                    <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                      <span>Ref ID: #{c.id.slice(0, 8)}</span>
                      <span>Raised: {new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    {c.wardenNotes && (
                      <div className="text-[11px] bg-blue-50/50 border border-blue-100/50 text-blue-900 rounded-lg p-2.5">
                        <strong className="font-bold text-blue-950">Resolution Notes:</strong> {c.wardenNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* WARDEN PORTAL VIEW */
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={styles.cardTitle}>Helpdesk Tickets Queue</h3>
          
          {loading ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading complaints...</p>
          ) : complaints.length === 0 ? (
            <p style={styles.emptyText}>All quiet. No active complaints registered.</p>
          ) : (
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Student & Room</th>
                    <th>Category</th>
                    <th>Issue Description</th>
                    <th>Priority</th>
                    <th>Date Raised</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={styles.studentCell}>
                          <h4 style={styles.studentCellName}>{c.student?.user?.name}</h4>
                          <span style={styles.studentCellRoom}>Room {c.student?.room?.roomNumber || 'N/A'}</span>
                        </div>
                      </td>
                      <td><strong>{c.category}</strong></td>
                      <td><span style={styles.tableDesc} title={c.description}>{c.description}</span></td>
                      <td>
                        <span style={{
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          ...c.priority === 'URGENT' ? { color: 'var(--danger)' } :
                             c.priority === 'HIGH' ? { color: 'var(--warning)' } :
                             c.priority === 'MEDIUM' ? { color: 'var(--info)' } :
                             { color: 'var(--text-secondary)' }
                        }}>
                          {c.priority}
                        </span>
                      </td>
                      <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${
                          c.status === 'RESOLVED' ? 'badge-success' :
                          c.status === 'IN_PROGRESS' ? 'badge-info' : 'badge-warning'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn-secondary" style={styles.actionBtn} onClick={() => openWardenActionModal(c)}>
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* WARDEN RESOLUTION UPDATE MODAL */}
      <CustomModal 
        isOpen={isActionModalOpen} 
        onClose={() => setIsActionModalOpen(false)} 
        title={`Process Ticket #${selectedComplaint?.id?.split('-')[0].toUpperCase()}`}
      >
        <form onSubmit={handleWardenActionSubmit} style={styles.modalForm}>
          <div className="form-group">
            <label className="form-label">Ticket Status</label>
            <select 
              className="form-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="PENDING">Pending (Inspection Awaited)</option>
              <option value="IN_PROGRESS">In Progress (Technician Assigned)</option>
              <option value="RESOLVED">Resolved (Issue Rectified)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Resolution Comments / Action Notes</label>
            <textarea 
              className="form-input" 
              rows="4" 
              placeholder="e.g. Electrician Sunil has been assigned. Scheduled to visit room A-101 today by 3 PM. / Tap washer replaced. Resolved."
              value={wardenNotes}
              onChange={(e) => setWardenNotes(e.target.value)}
            />
          </div>

          <div style={styles.modalActions}>
            <button type="button" className="btn-secondary" onClick={() => setIsActionModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Updating ticket...' : 'Save Ticket Status'}
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
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '1.5rem',
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
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxHeight: '480px',
    overflowY: 'auto',
    paddingRight: '0.25rem',
  },
  timelineItem: {
    padding: '1rem',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineCategory: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  priorityLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  timelineDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  dateStamp: {
    fontSize: '0.7rem',
    color: 'var(--text-tertiary)',
  },
  wardenNotesSection: {
    background: 'var(--accent-light)',
    border: '1px solid rgba(99,102,241,0.1)',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    color: 'var(--text-primary)',
    marginTop: '0.25rem',
  },
  studentCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  studentCellName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  studentCellRoom: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  tableDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    maxWidth: '250px',
    display: 'inline-block',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  actionBtn: {
    padding: '0.4rem 0.75rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
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

export default Complaints;

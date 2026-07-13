import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Wrench, ShieldAlert, CheckCircle, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';
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
    <div className="animate-fade-in flex flex-col gap-6 text-left">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        {user.role === 'STUDENT' && (
          <button 
            onClick={() => navigate('/student/dashboard')} 
            className="bg-slate-50 border border-slate-200/60 text-slate-500 hover:text-slate-900 cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h1 className="page-title leading-tight">
            {user.role === 'ADMIN' ? 'Maintenance Helpdesk' : 'Raise Complaint'}
          </h1>
          <p className="page-subtitle mb-0 mt-1">
            {user.role === 'ADMIN' ? 'Manage hostel issues, assign support staff, and log resolution feedback.' :
             'GHMS hostellers asset repair and support ticketing helpline'}
          </p>
        </div>
      </div>

      {/* Grid Layout depending on user role */}
      {user.role === 'STUDENT' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Submit form on left */}
          <div className="glass-card p-6 shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Raise Repair Complaint</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Submit asset issues for maintenance team dispatch</p>
            </div>
            
            {formError && (
              <div className="flex items-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold mb-4 animate-fade-in">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleStudentSubmit} className="flex flex-col gap-4">
              <div className="form-group mb-1">
                <label className="form-label">Category of Issue</label>
                <select 
                  className="form-input"
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

              <div className="form-group mb-1">
                <label className="form-label">Urgency Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, priority: p })}
                      className={`py-2 px-1 border rounded-lg text-center cursor-pointer transition-all duration-200 text-[10px] sm:text-xs font-bold leading-none ${
                        form.priority === p 
                          ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm' 
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="form-label">Describe the Issue</label>
                <textarea 
                  className="form-input h-24 py-2.5" 
                  required
                  placeholder="Describe details (e.g. Fan regulator broken, water leaking)..."
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn-primary w-full justify-center mt-2.5">
                <Wrench size={16} />
                <span>Raise Complaint</span>
              </button>
            </form>
          </div>

          {/* Ticket history on right */}
          <div className="glass-card p-6 shadow-sm flex flex-col">
            <div className="mb-5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">My Ticket History</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Track status updates of filed requests</p>
            </div>
            
            {loading ? (
              <p className="text-slate-400 font-medium text-center py-12 text-sm">Loading history log...</p>
            ) : complaints.length === 0 ? (
              <p className="text-slate-400 font-medium text-center py-12 text-sm">No complaints raised yet.</p>
            ) : (
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-2">
                {complaints.map((c) => (
                  <div key={c.id} className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col gap-3 text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{c.category}</span>
                      <span className={`badge ${
                        c.status === 'RESOLVED' ? 'badge-success' :
                        c.status === 'IN_PROGRESS' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {c.status.toLowerCase()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Priority:</span>
                      <span className={`font-bold ${
                        c.priority === 'URGENT' ? 'text-red-500' :
                        c.priority === 'HIGH' ? 'text-amber-500' :
                        c.priority === 'MEDIUM' ? 'text-blue-500' : 'text-slate-500'
                      }`}>
                        {c.priority}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 p-3 rounded-xl font-medium">{c.description}</p>
                    
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-t border-slate-50 pt-2.5 mt-1">
                      <span>Ref ID: #{c.id.slice(0, 8).toUpperCase()}</span>
                      <span>Raised: {new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    {c.wardenNotes && (
                      <div className="text-xs bg-blue-50 border border-blue-100 text-blue-800 rounded-xl p-3 mt-1">
                        <strong className="font-bold text-blue-900">Resolution Notes:</strong> {c.wardenNotes}
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
        <div className="glass-card p-6 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5">Helpdesk Tickets Queue</h3>
          
          {loading ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
              <div className="spinner"></div>
              <p className="text-slate-400 font-medium text-sm">Loading complaints list...</p>
            </div>
          ) : complaints.length === 0 ? (
            <p className="text-center py-12 text-slate-400 text-sm">All quiet. No active complaints registered.</p>
          ) : (
            <div className="custom-table-container animate-fade-in">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Student & Room</th>
                    <th>Category</th>
                    <th>Issue Description</th>
                    <th>Priority</th>
                    <th>Date Raised</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex flex-col text-slate-600 text-xs">
                          <h4 className="font-bold text-slate-800">{c.student?.user?.name}</h4>
                          <span className="text-[10px] text-slate-400 mt-0.5">Room {c.student?.room?.roomNumber || 'N/A'}</span>
                        </div>
                      </td>
                      <td><strong className="text-xs font-bold text-slate-800">{c.category}</strong></td>
                      <td>
                        <span className="text-xs text-slate-500 font-medium max-w-[220px] inline-block truncate" title={c.description}>
                          {c.description}
                        </span>
                      </td>
                      <td>
                        <span className={`text-xs font-bold ${
                          c.priority === 'URGENT' ? 'text-red-500' :
                          c.priority === 'HIGH' ? 'text-amber-500' :
                          c.priority === 'MEDIUM' ? 'text-blue-500' : 'text-slate-500'
                        }`}>
                          {c.priority}
                        </span>
                      </td>
                      <td className="text-xs text-slate-600 font-medium">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${
                          c.status === 'RESOLVED' ? 'badge-success' :
                          c.status === 'IN_PROGRESS' ? 'badge-info' : 'badge-warning'
                        }`}>
                          {c.status.toLowerCase()}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end">
                          <button className="btn-secondary h-9 px-3.5 text-xs font-bold shrink-0" onClick={() => openWardenActionModal(c)}>
                            Manage
                          </button>
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

      {/* WARDEN RESOLUTION UPDATE MODAL */}
      <CustomModal 
        isOpen={isActionModalOpen} 
        onClose={() => setIsActionModalOpen(false)} 
        title={`Process Ticket #${selectedComplaint?.id?.split('-')[0].toUpperCase()}`}
      >
        <form onSubmit={handleWardenActionSubmit} className="flex flex-col gap-4">
          <div className="form-group mb-0">
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

          <div className="form-group mb-0">
            <label className="form-label">Resolution Comments / Action Notes</label>
            <textarea 
              className="form-input h-24 py-2.5" 
              placeholder="e.g. Electrician Sunil has been assigned. Scheduled to visit room A-101 today by 3 PM. / Tap washer replaced. Resolved."
              value={wardenNotes}
              onChange={(e) => setWardenNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-2">
            <button type="button" className="btn-secondary h-11 px-5" onClick={() => setIsActionModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary h-11 px-5" disabled={actionLoading}>
              {actionLoading ? 'Updating ticket...' : 'Save Ticket Status'}
            </button>
          </div>
        </form>
      </CustomModal>
    </div>
  );
};

export default Complaints;


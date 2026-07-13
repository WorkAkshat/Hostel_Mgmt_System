import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Calendar, Clock, UserCheck, ShieldAlert, LogOut } from 'lucide-react';
import CustomModal from '../components/CustomModal';

const Visitors = () => {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
      setVisitors(data);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

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
    <div className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h1 className="page-title">Visitor Registry Log</h1>
          <p className="page-subtitle">Log new guest check-ins, associate hosts, and register departures.</p>
        </div>
        {(user.role === 'ADMIN' || user.role === 'STAFF') && (
          <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <UserPlus size={18} />
            <span>Check-in Visitor</span>
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading visitor registry...</p>
      ) : visitors.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>No visitors registered in logs.</p>
        </div>
      ) : (
        <div className="custom-table-container glass-card">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Visitor Name</th>
                <th>Relationship</th>
                <th>Contact</th>
                <th>Host Student</th>
                <th>Check In Details</th>
                <th>Check Out Details</th>
                <th>Operations</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((visitor) => (
                <tr key={visitor.id}>
                  <td>
                    <div style={styles.visitorCell}>
                      <div style={styles.avatar}>
                        {visitor.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={styles.visitorName}>{visitor.name}</h4>
                        <span style={styles.visitorTag}>Guest Entry</span>
                      </div>
                    </div>
                  </td>
                  <td><strong>{visitor.relationship}</strong></td>
                  <td>{visitor.phone}</td>
                  <td>
                    <div style={styles.hostCell}>
                      <span style={styles.hostName}>{visitor.student?.user?.name}</span>
                      <code style={styles.code}>{visitor.student?.rollNumber}</code>
                    </div>
                  </td>
                  <td>
                    <div style={styles.stampCell}>
                      <Calendar size={12} />
                      <span>{new Date(visitor.checkInTime).toLocaleDateString()}</span>
                      <Clock size={12} style={{ marginLeft: '0.25rem' }} />
                      <span>{new Date(visitor.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td>
                    {visitor.checkOutTime ? (
                      <div style={styles.stampCell}>
                        <Calendar size={12} />
                        <span>{new Date(visitor.checkOutTime).toLocaleDateString()}</span>
                        <Clock size={12} style={{ marginLeft: '0.25rem' }} />
                        <span>{new Date(visitor.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ) : (
                      <span style={styles.activeGuestLabel}>Still Checked In</span>
                    )}
                  </td>
                  <td>
                    {!visitor.checkOutTime ? (
                      (user.role === 'ADMIN' || user.role === 'STAFF') ? (
                        <button className="btn-primary" style={styles.checkoutBtn} onClick={() => handleCheckout(visitor.id)}>
                          <LogOut size={14} /> Log Checkout
                        </button>
                      ) : (
                        <span style={styles.activeGuestText}>Active Guest</span>
                      )
                    ) : (
                      <div style={styles.completedArea}>
                        <UserCheck size={14} color="var(--text-tertiary)" />
                        <span>Departure Logged</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CHECK-IN VISITOR MODAL */}
      <CustomModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Log Visitor Check-In">
        {formError && (
          <div style={styles.modalErrorBanner}>
            <ShieldAlert size={16} />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} style={styles.modalForm}>
          <div className="form-group">
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
          <div className="form-group">
            <label className="form-label">Visitor Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Visitor Phone Number</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={form.phone}
              onChange={(e) => setForm({...form, phone: e.target.value})}
            />
          </div>
          <div className="form-group">
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
          <div style={styles.modalActions}>
            <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Register Entry'}
            </button>
          </div>
        </form>
      </CustomModal>
    </div>
  );
};

const styles = {
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '2rem',
  },
  visitorCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
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
  visitorName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  visitorTag: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
  },
  hostCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  hostName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  code: {
    background: 'rgba(0, 0, 0, 0.02)',
    border: '1px solid var(--border-color)',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    alignSelf: 'flex-start',
    marginTop: '0.15rem',
  },
  stampCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  activeGuestLabel: {
    color: 'var(--success)',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  activeGuestText: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
  checkoutBtn: {
    padding: '0.4rem 0.75rem',
    fontSize: '0.75rem',
  },
  completedArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    color: 'var(--text-tertiary)',
    fontSize: '0.85rem',
    fontWeight: '500',
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
  },
  modalErrorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    color: 'var(--danger)',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  }
};

export default Visitors;

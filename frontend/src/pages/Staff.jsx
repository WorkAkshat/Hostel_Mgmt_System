import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Contact, UserPlus, Phone, Mail, ShieldAlert, Trash2 } from 'lucide-react';
import CustomModal from '../components/CustomModal';

const Staff = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '', email: '', password: '', department: 'Warden', designation: 'Assistant Warden', phoneNumber: ''
  });
  const [formError, setFormError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await api('/staff');
      setStaff(data);
    } catch (error) {
      console.error('Error fetching staff roster:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      setActionLoading(true);
      await api('/staff', {
        method: 'POST',
        body: form
      });
      setIsAddModalOpen(false);
      setForm({ name: '', email: '', password: '', department: 'Warden', designation: 'Assistant Warden', phoneNumber: '' });
      fetchStaff();
    } catch (error) {
      setFormError(error.message || 'Failed to create staff member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff member? This will disable their login credentials.')) {
      try {
        await api(`/staff/${id}`, {
          method: 'DELETE'
        });
        fetchStaff();
      } catch (error) {
        alert(error.message || 'Failed to delete staff member');
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h1 className="page-title">Staff & Warden Roster</h1>
          <p className="page-subtitle">Roster of hostel wardens, cleaning staff, security personnel, and technicians.</p>
        </div>
        {user.role === 'ADMIN' && (
          <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <UserPlus size={18} />
            <span>Register Employee</span>
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading staff records...</p>
      ) : staff.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>No staff registered in logs.</p>
        </div>
      ) : (
        <div style={styles.staffGrid}>
          {staff.map((member) => (
            <div key={member.id} className="glass-card glass-card-interactive" style={styles.staffCard}>
              <div style={styles.avatarLarge}>
                {member.user?.name?.charAt(0).toUpperCase()}
              </div>
              <h3 style={styles.memberName}>{member.user?.name}</h3>
              <span style={styles.departmentBadge}>{member.department}</span>
              
              <div style={styles.memberMeta}>
                <p style={styles.metaTitle}>{member.designation}</p>
                <div style={styles.contactRow}>
                  <Mail size={14} color="var(--text-tertiary)" />
                  <span style={styles.contactText}>{member.user?.email}</span>
                </div>
                <div style={styles.contactRow}>
                  <Phone size={14} color="var(--text-tertiary)" />
                  <span style={styles.contactText}>{member.phoneNumber}</span>
                </div>
              </div>

              {user.role === 'ADMIN' && member.userId !== user.id && (
                <button 
                  style={styles.deleteBtn}
                  onClick={() => handleDelete(member.id)}
                  title="Remove Employee"
                >
                  <Trash2 size={16} />
                  <span>Remove Roster</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CREATE STAFF MODAL */}
      <CustomModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register Employee Record">
        {formError && (
          <div style={styles.modalErrorBanner}>
            <ShieldAlert size={16} />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} style={styles.modalForm}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              required
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              required
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select 
              className="form-input"
              value={form.department}
              onChange={(e) => setForm({...form, department: e.target.value})}
            >
              <option value="Warden">Administration / Warden</option>
              <option value="Security">Security Wing</option>
              <option value="Mess">Mess Committee</option>
              <option value="Cleaning">Cleaning & Sanitation</option>
              <option value="Maintenance">Technician / Repairs</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Designation / Role Title</label>
            <input 
              type="text" 
              className="form-input" 
              required
              placeholder="e.g. Chief Warden, Gate Officer"
              value={form.designation}
              onChange={(e) => setForm({...form, designation: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Phone Number</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={form.phoneNumber}
              onChange={(e) => setForm({...form, phoneNumber: e.target.value})}
            />
          </div>
          <div style={styles.modalActions}>
            <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Register Employee'}
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
    marginBottom: '2rem',
  },
  staffGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '1.5rem',
  },
  staffCard: {
    padding: '1.75rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  avatarLarge: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'var(--accent)',
    color: '#ffffff',
    fontSize: '1.75rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    border: '3px solid rgba(236, 72, 153, 0.15)',
    boxShadow: 'var(--shadow-sm)',
  },
  memberName: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '0.25rem',
  },
  departmentBadge: {
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '0.2rem 0.6rem',
    borderRadius: '30px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '1.25rem',
  },
  memberMeta: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '1rem',
    marginBottom: '1.5rem',
  },
  metaTitle: {
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    fontWeight: '600',
    marginBottom: '0.25rem',
  },
  contactRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
  },
  contactText: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deleteBtn: {
    marginTop: 'auto',
    background: 'transparent',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--danger)',
    padding: '0.4rem 0.75rem',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    transition: 'all 0.2s ease',
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

// CSS styles injection
const addStaffPageStyles = () => {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    .staff-del-btn:hover {
      background: var(--danger-bg) !important;
      borderColor: var(--danger) !important;
    }
  `;
  document.head.appendChild(styleEl);
};
addStaffPageStyles();

export default Staff;

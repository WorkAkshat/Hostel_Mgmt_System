import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Phone, Mail, ShieldAlert, Trash2 } from 'lucide-react';
import CustomModal from '../components/CustomModal';

const MOCK_STAFF = [
  {
    id: 's1',
    user: { name: 'Dr. Meena Gupta', email: 'm.gupta@hostel.edu' },
    department: 'Warden',
    designation: 'Chief Warden',
    phoneNumber: '+91 99999 11111'
  },
  {
    id: 's2',
    user: { name: 'Rajesh Singh', email: 'r.singh@hostel.edu' },
    department: 'Security',
    designation: 'Head Security Officer',
    phoneNumber: '+91 88888 22222'
  },
  {
    id: 's3',
    user: { name: 'Sarla Devi', email: 's.devi@hostel.edu' },
    department: 'Cleaning',
    designation: 'Sanitation Supervisor',
    phoneNumber: '+91 77777 33333'
  },
  {
    id: 's4',
    user: { name: 'Abdul Rahman', email: 'a.rahman@hostel.edu' },
    department: 'Maintenance',
    designation: 'Senior Electrician',
    phoneNumber: '+91 66666 44444'
  }
];

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
      if (data && data.length > 0) {
        // Append MOCK_STAFF to show more content as requested
        setStaff([...data, ...MOCK_STAFF.filter(m => !data.find(d => d.user?.email === m.user?.email))]);
      } else {
        setStaff(MOCK_STAFF);
      }
    } catch (error) {
      console.error('Error fetching staff roster:', error);
      setStaff(MOCK_STAFF);
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
    <div className="animate-fade-in flex flex-col gap-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="page-header mb-0 sm:mb-0">
          <h1 className="page-title">Staff & Warden Roster</h1>
          <p className="page-subtitle">Roster of hostel wardens, cleaning staff, security personnel, and technicians.</p>
        </div>
        {user.role === 'ADMIN' && (
          <button className="btn-primary shadow-sm" onClick={() => setIsAddModalOpen(true)}>
            <UserPlus size={18} />
            <span>Register Employee</span>
          </button>
        )}
      </div>

      {/* Roster Cards Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
          <div className="spinner"></div>
          <p className="text-slate-400 font-medium text-sm">Loading staff records...</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-slate-400 font-medium">No staff registered in logs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {staff.map((member) => (
            <div 
              key={member.id} 
              className="glass-card p-6 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center relative group"
            >
              {/* Profile Avatar */}
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 font-extrabold text-xl flex items-center justify-center border-4 border-slate-50 shadow-inner mb-4">
                {member.user?.name?.charAt(0).toUpperCase()}
              </div>

              {/* Identity details */}
              <h3 className="text-sm font-bold text-slate-800 leading-tight truncate w-full">{member.user?.name}</h3>
              <span className="inline-block mt-2 bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 border border-blue-100/50">
                {member.department}
              </span>
              
              {/* Contact meta lines */}
              <div className="w-full flex flex-col gap-2.5 border-t border-slate-100 pt-4 mb-5 text-xs text-slate-600">
                <p className="font-bold text-slate-700">{member.designation}</p>
                <div className="flex items-center gap-2 justify-center overflow-hidden w-full">
                  <Mail size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate hover:text-slate-900" title={member.user?.email}>{member.user?.email}</span>
                </div>
                <div className="flex items-center gap-2 justify-center overflow-hidden w-full">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{member.phoneNumber}</span>
                </div>
              </div>

              {/* Action operations */}
              {user.role === 'ADMIN' && member.userId !== user.id && (
                <button 
                  onClick={() => handleDelete(member.id)}
                  className="w-full h-10 border border-red-200 hover:bg-red-50 text-red-500 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all bg-white mt-auto"
                  title="Remove Employee"
                >
                  <Trash2 size={14} />
                  <span>Remove Roster</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* REGISTER STAFF MODAL */}
      <CustomModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register Employee Record">
        {formError && (
          <div className="flex items-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold mb-4 animate-fade-in">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group mb-0 full-width">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              required
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              required
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
            />
          </div>
          <div className="form-group mb-0">
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
          <div className="form-group mb-0">
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
          <div className="form-group mb-0">
            <label className="form-label">Contact Phone Number</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={form.phoneNumber}
              onChange={(e) => setForm({...form, phoneNumber: e.target.value})}
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-2 full-width">
            <button type="button" className="btn-secondary h-11 px-5" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary h-11 px-5" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Register Employee'}
            </button>
          </div>
        </form>
      </CustomModal>
    </div>
  );
};

export default Staff;


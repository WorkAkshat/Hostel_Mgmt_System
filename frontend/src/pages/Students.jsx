import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Search, UserPlus, Edit, Trash2, Mail, Phone, Home, ShieldAlert, Award } from 'lucide-react';
import CustomModal from '../components/CustomModal';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Add Form state
  const [addForm, setAddForm] = useState({
    name: '', email: '', password: '', rollNumber: '', phoneNumber: '', parentContact: '', roomId: ''
  });
  const [addError, setAddError] = useState(null);

  // Edit Form state
  const [editForm, setEditForm] = useState({
    name: '', phoneNumber: '', parentContact: '', roomId: '', status: ''
  });
  const [editError, setEditError] = useState(null);

  // Fetch initial records
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [studentsData, roomsData] = await Promise.all([
        api('/students'),
        api('/rooms')
      ]);
      setStudents(studentsData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Filter students based on search and dropdown filters
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.room?.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === '' || student.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handle student creation
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError(null);
    try {
      await api('/students', {
        method: 'POST',
        body: addForm
      });
      setIsAddModalOpen(false);
      setAddForm({ name: '', email: '', password: '', rollNumber: '', phoneNumber: '', parentContact: '', roomId: '' });
      fetchInitialData();
    } catch (err) {
      setAddError(err.message || 'Failed to create student');
    }
  };

  // Open edit modal with student data pre-filled
  const openEditModal = (student) => {
    setSelectedStudent(student);
    setEditForm({
      name: student.user?.name || '',
      phoneNumber: student.phoneNumber || '',
      parentContact: student.parentContact || '',
      roomId: student.roomId || '',
      status: student.status || ''
    });
    setIsEditModalOpen(true);
  };

  // Handle student update
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);
    try {
      await api(`/students/${selectedStudent.id}`, {
        method: 'PUT',
        body: editForm
      });
      setIsEditModalOpen(false);
      fetchInitialData();
    } catch (err) {
      setEditError(err.message || 'Failed to update student');
    }
  };

  // Handle student deletion
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student? This will also remove their user account, invoice history, and complaints.')) {
      try {
        await api(`/students/${id}`, {
          method: 'DELETE'
        });
        fetchInitialData();
      } catch (error) {
        alert(error.message || 'Failed to delete student');
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
          <h1 className="page-title">Student Directory</h1>
          <p className="page-subtitle">Add, edit, remove student enrollments and manage room allocation mapping.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <UserPlus size={18} />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-card" style={styles.filtersBar}>
        <div style={styles.searchWrapper}>
          <Search size={18} style={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search by name, roll number, or room..." 
            className="form-input"
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="form-input" 
          style={styles.filterDropdown}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="CHECKED_OUT">Checked Out</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Students Data Grid */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading directory...</p>
      ) : filteredStudents.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>No students match your query filters.</p>
        </div>
      ) : (
        <div className="custom-table-container glass-card">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Student Info</th>
                <th>Roll Number</th>
                <th>Contact</th>
                <th>Assigned Room</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div style={styles.studentInfo}>
                      <div style={styles.avatar}>
                        {student.user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={styles.studentName}>{student.user?.name}</h4>
                        <span style={styles.studentEmail}>{student.user?.email}</span>
                      </div>
                    </div>
                  </td>
                  <td><code style={styles.code}>{student.rollNumber}</code></td>
                  <td>
                    <div style={styles.contactDetails}>
                      <span><Phone size={12} /> {student.phoneNumber}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Parent: {student.parentContact}</span>
                    </div>
                  </td>
                  <td>
                    {student.room ? (
                      <span style={styles.roomTag}>
                        <Home size={12} />
                        <span>Room {student.room.roomNumber} ({student.room.block})</span>
                      </span>
                    ) : (
                      <span style={styles.pendingAllocation}>Unallocated</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      student.status === 'CHECKED_IN' ? 'badge-success' : 
                      student.status === 'CHECKED_OUT' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {student.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div style={styles.actions}>
                      <button style={styles.actionBtnEdit} onClick={() => openEditModal(student)} title="Edit profile">
                        <Edit size={16} />
                      </button>
                      <button style={styles.actionBtnDelete} onClick={() => handleDelete(student.id)} title="Delete record">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE STUDENT MODAL */}
      <CustomModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register Student">
        {addError && (
          <div style={styles.modalErrorBanner}>
            <ShieldAlert size={16} />
            <span>{addError}</span>
          </div>
        )}
        <form onSubmit={handleAddSubmit} style={styles.modalForm}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={addForm.name}
              onChange={(e) => setAddForm({...addForm, name: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              required
              value={addForm.email}
              onChange={(e) => setAddForm({...addForm, email: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              required
              placeholder="Min 6 characters"
              value={addForm.password}
              onChange={(e) => setAddForm({...addForm, password: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">University Roll Number</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={addForm.rollNumber}
              onChange={(e) => setAddForm({...addForm, rollNumber: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Student Phone</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={addForm.phoneNumber}
              onChange={(e) => setAddForm({...addForm, phoneNumber: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Emergency/Parent Contact</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={addForm.parentContact}
              onChange={(e) => setAddForm({...addForm, parentContact: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Assign Room</label>
            <select 
              className="form-input"
              value={addForm.roomId}
              onChange={(e) => setAddForm({...addForm, roomId: e.target.value})}
            >
              <option value="">No Allocation</option>
              {rooms.map(room => (
                <option 
                  key={room.id} 
                  value={room.id}
                  disabled={room.status === 'FULL' || room.status === 'MAINTENANCE'}
                >
                  {room.roomNumber} ({room.block}) - {room.status}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.modalActions}>
            <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Register</button>
          </div>
        </form>
      </CustomModal>

      {/* EDIT STUDENT MODAL */}
      <CustomModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Update Profile: ${selectedStudent?.user?.name}`}>
        {editError && (
          <div style={styles.modalErrorBanner}>
            <ShieldAlert size={16} />
            <span>{editError}</span>
          </div>
        )}
        <form onSubmit={handleEditSubmit} style={styles.modalForm}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={editForm.name}
              onChange={(e) => setEditForm({...editForm, name: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Student Phone</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={editForm.phoneNumber}
              onChange={(e) => setEditForm({...editForm, phoneNumber: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Parent Contact</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={editForm.parentContact}
              onChange={(e) => setEditForm({...editForm, parentContact: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Room Allocation Mapping</label>
            <select 
              className="form-input"
              value={editForm.roomId}
              onChange={(e) => setEditForm({...editForm, roomId: e.target.value})}
            >
              <option value="">No Allocation</option>
              {rooms.map(room => (
                <option 
                  key={room.id} 
                  value={room.id}
                  disabled={room.status === 'FULL' && room.id !== selectedStudent?.roomId}
                >
                  {room.roomNumber} ({room.block}) - {room.status}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Attendance Status</label>
            <select 
              className="form-input"
              value={editForm.status}
              onChange={(e) => setEditForm({...editForm, status: e.target.value})}
            >
              <option value="CHECKED_IN">Checked In</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <div style={styles.modalActions}>
            <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
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
  filtersBar: {
    padding: '1rem 1.5rem',
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
  },
  searchWrapper: {
    position: 'relative',
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    color: '#6b7280',
  },
  searchInput: {
    paddingLeft: '2.75rem',
    width: '100%',
  },
  filterDropdown: {
    width: '180px',
  },
  studentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(99, 102, 241, 0.1)',
  },
  studentName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  studentEmail: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
  },
  code: {
    background: 'rgba(0, 0, 0, 0.02)',
    border: '1px solid var(--border-color)',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  contactDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    fontSize: '0.85rem',
  },
  roomTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    padding: '0.25rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  pendingAllocation: {
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
    fontSize: '0.85rem',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  actionBtnEdit: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  actionBtnDelete: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--danger)',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
const addStudentPageStyles = () => {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    .action-edit-hover:hover {
      border-color: var(--accent) !important;
      color: var(--accent) !important;
      background: var(--accent-light) !important;
    }
    .action-del-hover:hover {
      border-color: var(--danger) !important;
      color: var(--danger) !important;
      background: var(--danger-bg) !important;
    }
  `;
  document.head.appendChild(styleEl);
};
addStudentPageStyles();

export default Students;

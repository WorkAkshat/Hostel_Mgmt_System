import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { Search, UserPlus, Edit, Trash2, Mail, Phone, Home, ShieldAlert } from 'lucide-react';
import CustomModal from '../components/CustomModal';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const location = useLocation();
  
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

  useEffect(() => {
    if (location.state?.action === 'add') {
      setIsAddModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Filter students
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

  // Open edit modal
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
    <div className="animate-fade-in flex flex-col gap-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="page-header mb-0 sm:mb-0">
          <h1 className="page-title">Students Directory</h1>
          <p className="page-subtitle">Add, edit, remove student enrollments and manage room allocation mapping.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <UserPlus size={18} />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-5 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex items-center w-full sm:max-w-md">
          <Search size={18} className="absolute left-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, roll number, or room..." 
            className="form-input pl-11 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="form-input w-full sm:w-[200px]" 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="CHECKED_OUT">Checked Out</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Directory Content */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
          <div className="spinner"></div>
          <p className="text-slate-400 font-medium text-sm">Loading directory records...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center gap-2">
          <p className="text-slate-400 font-medium">No students match your query filters.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student Info</th>
                  <th>Roll Number</th>
                  <th>Contact Details</th>
                  <th>Assigned Room</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-extrabold text-sm flex items-center justify-center border border-blue-100/60 shadow-sm shrink-0">
                          {student.user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <h4 className="text-sm font-bold text-slate-800 truncate">{student.user?.name}</h4>
                          <span className="text-xs text-slate-400 truncate mt-0.5">{student.user?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded text-slate-600 font-mono text-xs font-semibold">
                        {student.rollNumber}
                      </code>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 text-slate-600 text-xs">
                        <span className="flex items-center gap-1"><Phone size={12} className="text-slate-400" />{student.phoneNumber}</span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Parent: {student.parentContact}</span>
                      </div>
                    </td>
                    <td>
                      {student.room ? (
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-xl text-xs font-bold border border-blue-100">
                          <Home size={12} />
                          <span>Room {student.room.roomNumber} ({student.room.block})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Unallocated</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${
                        student.status === 'CHECKED_IN' ? 'badge-success' : 
                        student.status === 'CHECKED_OUT' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {student.status.replace('_', ' ').toLowerCase()}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(student)}
                          className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition-all hover:text-slate-800" 
                          title="Edit Student"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(student.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 flex items-center justify-center text-red-500 cursor-pointer transition-all" 
                          title="Delete Record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredStudents.map((student) => (
              <div 
                key={student.id} 
                className="glass-card p-5 shadow-sm flex flex-col gap-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-extrabold text-sm flex items-center justify-center border border-blue-100/60 shadow-sm shrink-0">
                      {student.user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <h4 className="text-sm font-bold text-slate-800 truncate">{student.user?.name}</h4>
                      <span className="text-[11px] text-slate-400 truncate mt-0.5">{student.user?.email}</span>
                    </div>
                  </div>
                  <span className={`badge shrink-0 ${
                    student.status === 'CHECKED_IN' ? 'badge-success' : 
                    student.status === 'CHECKED_OUT' ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {student.status.replace('_', ' ').toLowerCase()}
                  </span>
                </div>

                <div className="h-[1px] bg-slate-100" />

                <div className="flex flex-col gap-2.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Roll Number:</span>
                    <span className="font-mono bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">{student.rollNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Student Phone:</span>
                    <span className="font-medium">{student.phoneNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Parent Phone:</span>
                    <span className="font-medium">{student.parentContact}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Assigned Room:</span>
                    {student.room ? (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[11px] font-bold border border-blue-100/50">
                        <Home size={10} />
                        <span>Room {student.room.roomNumber} ({student.room.block})</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Unallocated</span>
                    )}
                  </div>
                </div>

                <div className="h-[1px] bg-slate-100 mt-1" />

                <div className="flex justify-end gap-3 mt-1">
                  <button 
                    onClick={() => openEditModal(student)}
                    className="flex-grow h-10 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all bg-white"
                  >
                    <Edit size={14} />
                    <span>Edit Profile</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(student.id)}
                    className="w-10 h-10 border border-red-200 hover:bg-red-50 text-red-500 rounded-xl flex items-center justify-center cursor-pointer transition-all bg-white"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CREATE STUDENT MODAL */}
      <CustomModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register Student">
        {addError && (
          <div className="flex items-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold mb-4 animate-fade-in">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{addError}</span>
          </div>
        )}
        <form onSubmit={handleAddSubmit} className="form-grid">
          <div className="form-group full-width">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              required
              placeholder="e.g. Jane Doe"
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
              placeholder="e.g. student@university.edu"
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
              placeholder="Minimum 6 characters required"
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
              placeholder="e.g. 2024CS001"
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
              placeholder="Enter 10-digit mobile number"
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
              placeholder="Enter guardian's contact number"
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
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Register</button>
          </div>
        </form>
      </CustomModal>

      {/* EDIT STUDENT MODAL */}
      <CustomModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Update Profile: ${selectedStudent?.user?.name}`}>
        {editError && (
          <div className="flex items-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold mb-4 animate-fade-in">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{editError}</span>
          </div>
        )}
        <form onSubmit={handleEditSubmit} className="form-grid">
          <div className="form-group full-width">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              required
              placeholder="e.g. Jane Doe"
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
              placeholder="Enter 10-digit mobile number"
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
              placeholder="Enter guardian's contact number"
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
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </CustomModal>
    </div>
  );
};

export default Students;


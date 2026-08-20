import { useState, useEffect } from 'react';
import { auth as authApi, rooms as roomsApi } from '../utils/api';
import { Check, X, ShieldAlert, Users, Calendar, Mail, Phone, Home, FileText, CheckSquare, XSquare, Plus, User, Heart, Map, MapPin, GraduationCap, Briefcase } from 'lucide-react';
import CustomModal from '../components/CustomModal';

const Approvals = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Approval Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveForm, setApproveForm] = useState({
    role: '',
    roomId: '',
    phoneNumber: '',
    parentContact: '',
    department: '',
    designation: ''
  });
  const [approveError, setApproveError] = useState(null);
  const [approving, setApproving] = useState(false);

  // Fetch pending registrations and rooms
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pendingData, roomsData] = await Promise.all([
        authApi.getPending(),
        roomsApi.getAll()
      ]);
      setPendingUsers(pendingData);
      setRooms(roomsData);
    } catch (err) {
      console.error('Error fetching approvals data:', err);
      setError(err.message || 'Failed to load approvals queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openApproveModal = (user) => {
    const originalRole = user.role.replace('PENDING_', '');
    setSelectedUser(user);
    
    // Pre-populate details from registration
    setApproveForm({
      role: originalRole,
      roomId: '',
      phoneNumber: user.student?.phoneNumber || user.staff?.phoneNumber || '',
      parentContact: user.student?.parentContact || '',
      department: user.staff?.department || 'Warden',
      designation: user.staff?.designation || '',
      dateOfJoining: user.student?.dateOfJoining ? new Date(user.student.dateOfJoining).toISOString().split('T')[0] : '',
      maritalStatus: user.student?.maritalStatus || 'Unmarried',
      fatherName: user.student?.fatherName || '',
      dob: user.student?.dob ? new Date(user.student.dob).toISOString().split('T')[0] : '',
      permanentAddress: user.student?.permanentAddress || '',
      state: user.student?.state || '',
      pincode: user.student?.pincode || '',
      coachingCollege: user.student?.coachingCollege || ''
    });
    
    setApproveError(null);
    setIsApproveModalOpen(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    setApproveError(null);

    // Validate phone length
    if (approveForm.role === 'STUDENT' || approveForm.role === 'STAFF') {
      if (approveForm.phoneNumber.length !== 10) {
        setApproveError('Contact phone number must be exactly 10 digits.');
        return;
      }
    }
    if (approveForm.role === 'STUDENT' && approveForm.parentContact.length !== 10) {
      setApproveError('Emergency/Parent phone number must be exactly 10 digits.');
      return;
    }

    setApproving(true);

    try {
      await authApi.approve(selectedUser.id, approveForm);
      setIsApproveModalOpen(false);
      setSelectedUser(null);
      fetchData();
    } catch (err) {
      setApproveError(err.message || 'Failed to approve registration.');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (id, name) => {
    if (window.confirm(`Are you sure you want to reject the registration request from ${name}? This will delete their pending credentials.`)) {
      try {
        setLoading(true);
        await authApi.reject(id);
        fetchData();
      } catch (err) {
        alert(err.message || 'Failed to reject registration request.');
        setLoading(false);
      }
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6 text-left">
      <div className="page-header">
        <h1 className="page-title">User Approvals Queue</h1>
        <p className="page-subtitle">
          Review pending user registrations. Grant residential roles, allocate rooms, and define system rights.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold">
          <ShieldAlert size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
          <div className="spinner"></div>
          <p className="text-slate-400 font-medium text-sm">Loading pending registration requests...</p>
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
            <CheckSquare size={36} />
          </div>
          <h3 className="text-slate-700 font-bold text-lg">No Pending Registrations</h3>
          <p className="text-slate-400 text-sm max-w-sm">
            All user registration requests have been reviewed. There are no users waiting in the queue.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Requested Role</th>
                  <th>Contact info</th>
                  <th>Application Details</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((pUser) => {
                  const reqRole = pUser.role.replace('PENDING_', '');
                  return (
                    <tr key={pUser.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-extrabold text-sm flex items-center justify-center border border-slate-200/50">
                            {pUser.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <h4 className="text-sm font-bold text-slate-800">{pUser.name}</h4>
                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                              <Mail size={12} />
                              <span>{pUser.email}</span>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          reqRole === 'STUDENT' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {reqRole}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1 text-slate-600 text-xs font-medium">
                          <span className="flex items-center gap-1">
                            <Phone size={12} className="text-slate-400" />
                            <span>{pUser.student?.phoneNumber || pUser.staff?.phoneNumber}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        {reqRole === 'STUDENT' ? (
                          <div className="flex flex-col gap-0.5 text-slate-500 text-xs">
                            <span>Father: <strong className="text-slate-700">{pUser.student?.fatherName}</strong></span>
                            <span>College: <strong className="text-slate-700">{pUser.student?.coachingCollege}</strong></span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5 text-slate-500 text-xs">
                            <span>Dept: <strong className="text-slate-700">{pUser.staff?.department}</strong></span>
                            <span>Designation: <strong className="text-slate-700">{pUser.staff?.designation}</strong></span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => openApproveModal(pUser)}
                            className="h-8 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 flex items-center gap-1 text-emerald-600 text-xs font-bold cursor-pointer transition-all"
                          >
                            <Check size={14} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(pUser.id, pUser.name)}
                            className="h-8 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200/50 flex items-center gap-1 text-rose-500 text-xs font-bold cursor-pointer transition-all"
                          >
                            <X size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {pendingUsers.map((pUser) => {
              const reqRole = pUser.role.replace('PENDING_', '');
              return (
                <div key={pUser.id} className="glass-card p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-extrabold text-sm flex items-center justify-center border border-slate-200/50">
                        {pUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-sm font-bold text-slate-800">{pUser.name}</h4>
                        <span className="text-[11px] text-slate-400 font-medium truncate max-w-[150px]">{pUser.email}</span>
                      </div>
                    </div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      reqRole === 'STUDENT' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {reqRole}
                    </span>
                  </div>

                  <div className="h-[1px] bg-slate-100" />

                  <div className="flex flex-col gap-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Phone Contact:</span>
                      <span className="font-semibold">{pUser.student?.phoneNumber || pUser.staff?.phoneNumber}</span>
                    </div>
                    {reqRole === 'STUDENT' ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Father's Name:</span>
                          <span className="font-semibold">{pUser.student?.fatherName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">College:</span>
                          <span className="font-semibold">{pUser.student?.coachingCollege}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Department:</span>
                          <span className="font-semibold">{pUser.staff?.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Designation:</span>
                          <span className="font-semibold">{pUser.staff?.designation}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="h-[1px] bg-slate-100" />

                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                      onClick={() => openApproveModal(pUser)}
                      className="h-10 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 rounded-xl text-emerald-600 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Check size={14} />
                      <span>Approve Account</span>
                    </button>
                    <button
                      onClick={() => handleReject(pUser.id, pUser.name)}
                      className="h-10 bg-rose-50 hover:bg-rose-100 border border-rose-200/50 rounded-xl text-rose-500 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <X size={14} />
                      <span>Reject request</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* APPROVAL MODAL */}
      <CustomModal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title={`Approve User Profile: ${selectedUser?.name}`}
        size="lg"
      >
        {approveError && (
          <div className="flex items-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold mb-4">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{approveError}</span>
          </div>
        )}

        {/* Dynamic Detail Card */}
        {selectedUser && (
          <div className="mb-5 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-3">
            <h4 className="text-[13px] font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200/50 pb-2">
              <User size={14} className="text-blue-500" />
              <span>Submitted Registration Details</span>
            </h4>
            
            {selectedUser.role.includes('STUDENT') ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs text-left">
                <div className="flex justify-between border-b border-slate-200/30 pb-1">
                  <span className="text-slate-400 font-semibold">Father's Name:</span>
                  <span className="text-slate-700 font-bold">{selectedUser.student?.fatherName || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/30 pb-1">
                  <span className="text-slate-400 font-semibold">Date of Birth:</span>
                  <span className="text-slate-700 font-bold">
                    {selectedUser.student?.dob ? new Date(selectedUser.student.dob).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/30 pb-1">
                  <span className="text-slate-400 font-semibold">Date of Joining:</span>
                  <span className="text-slate-700 font-bold">
                    {selectedUser.student?.dateOfJoining ? new Date(selectedUser.student.dateOfJoining).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/30 pb-1">
                  <span className="text-slate-400 font-semibold">Marital Status:</span>
                  <span className="text-slate-700 font-bold">{selectedUser.student?.maritalStatus || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/30 pb-1 col-span-1 sm:col-span-2">
                  <span className="text-slate-400 font-semibold">College / Coaching:</span>
                  <span className="text-slate-700 font-bold">{selectedUser.student?.coachingCollege || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/30 pb-1 col-span-1 sm:col-span-2">
                  <span className="text-slate-400 font-semibold">State & Pincode:</span>
                  <span className="text-slate-700 font-bold">
                    {selectedUser.student?.state || 'N/A'} - {selectedUser.student?.pincode || 'N/A'}
                  </span>
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2 pt-1">
                  <span className="text-slate-400 font-semibold">Permanent Address:</span>
                  <span className="text-slate-700 font-medium leading-relaxed bg-white border border-slate-200/50 p-2.5 rounded-xl mt-1">
                    {selectedUser.student?.permanentAddress || 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs text-left">
                <div className="flex justify-between border-b border-slate-200/30 pb-1">
                  <span className="text-slate-400 font-semibold">Department:</span>
                  <span className="text-slate-700 font-bold">{selectedUser.staff?.department || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/30 pb-1">
                  <span className="text-slate-400 font-semibold">Designation:</span>
                  <span className="text-slate-700 font-bold">{selectedUser.staff?.designation || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleApproveSubmit} className="form-grid text-left">
          <div className="form-group full-width">
            <label className="form-label">Assign Final System Role</label>
            <div className="grid grid-cols-3 gap-2.5 p-1 bg-slate-100 rounded-[14px]">
              {['STUDENT', 'STAFF', 'ADMIN'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setApproveForm({ ...approveForm, role: r })}
                  className={`py-2 rounded-[11px] font-bold text-[12px] border-none cursor-pointer transition-all ${
                    approveForm.role === r
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {r === 'ADMIN' ? 'Admin (Warden)' : r === 'STUDENT' ? 'Student' : 'Staff'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
              Selecting "Admin" gives the user absolute read and write rights on all hostel management parameters. 
              Selecting "Student" or "Staff" restricts access to their respective portal features.
            </p>
          </div>

          <div className="w-full h-[1px] bg-slate-100 full-width my-2"></div>

          {/* Contact Phone Number */}
          <div className="form-group">
            <label className="form-label">Contact Phone Number</label>
            <div className="relative flex items-center">
              <Phone size={15} className="absolute left-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="10-digit number"
                className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                required
                value={approveForm.phoneNumber}
                onChange={(e) => setApproveForm({ ...approveForm, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              />
            </div>
          </div>

          {approveForm.role === 'STUDENT' && (
            <>


              {/* Emergency Contact */}
              <div className="form-group">
                <label className="form-label">Emergency/Parent Contact</label>
                <div className="relative flex items-center">
                  <Phone size={15} className="absolute left-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Emergency phone contact"
                    className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                    required
                    value={approveForm.parentContact}
                    onChange={(e) => setApproveForm({ ...approveForm, parentContact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  />
                </div>
              </div>

              {/* Father's Name */}
              <div className="form-group">
                <label className="form-label">Father's Name</label>
                <div className="relative flex items-center">
                  <User size={15} className="absolute left-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Father's Full Name"
                    className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                    required
                    value={approveForm.fatherName}
                    onChange={(e) => setApproveForm({ ...approveForm, fatherName: e.target.value })}
                  />
                </div>
              </div>

              {/* Date of Joining */}
              <div className="form-group">
                <label className="form-label">Date of Joining</label>
                <div className="relative flex items-center">
                  <Calendar size={15} className="absolute left-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                    required
                    value={approveForm.dateOfJoining}
                    onChange={(e) => setApproveForm({ ...approveForm, dateOfJoining: e.target.value })}
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <div className="relative flex items-center">
                  <Calendar size={15} className="absolute left-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                    required
                    value={approveForm.dob}
                    onChange={(e) => setApproveForm({ ...approveForm, dob: e.target.value })}
                  />
                </div>
              </div>

              {/* Marital Status */}
              <div className="form-group">
                <label className="form-label">Marital Status</label>
                <div className="relative flex items-center">
                  <Heart size={15} className="absolute left-4 text-slate-400 pointer-events-none z-10" />
                  <select
                    value={approveForm.maritalStatus}
                    onChange={(e) => setApproveForm({ ...approveForm, maritalStatus: e.target.value })}
                    className="w-full h-11 pl-10 pr-8 rounded-[12px] border border-slate-200 bg-white text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="Unmarried">Unmarried</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                  <div className="absolute right-4 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-slate-400 w-0 h-0" />
                </div>
              </div>

              {/* College / Coaching Name */}
              <div className="form-group">
                <label className="form-label">College / Coaching Name</label>
                <div className="relative flex items-center">
                  <GraduationCap size={15} className="absolute left-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="College/Coaching name"
                    className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                    required
                    value={approveForm.coachingCollege}
                    onChange={(e) => setApproveForm({ ...approveForm, coachingCollege: e.target.value })}
                  />
                </div>
              </div>

              {/* Room Allocation Mapping */}
              <div className="form-group">
                <label className="form-label">Room Allocation Mapping</label>
                <div className="relative flex items-center">
                  <Home size={15} className="absolute left-4 text-slate-400 pointer-events-none z-10" />
                  <select
                    value={approveForm.roomId}
                    onChange={(e) => setApproveForm({ ...approveForm, roomId: e.target.value })}
                    className="w-full h-11 pl-10 pr-8 rounded-[12px] border border-slate-200 bg-white text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="">No Allocation (Keep Unallocated)</option>
                    {rooms.map((room) => (
                      <option
                        key={room.id}
                        value={room.id}
                        disabled={room.status === 'FULL' || room.status === 'MAINTENANCE'}
                      >
                        Room {room.roomNumber} ({room.block}) - Available ({room.sharingType - room.students.length} beds left)
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-slate-400 w-0 h-0" />
                </div>
              </div>

              {/* Permanent Address */}
              <div className="form-group full-width">
                <label className="form-label">Permanent Address</label>
                <div className="relative flex items-center">
                  <MapPin size={15} className="absolute left-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="House/Street, Locality"
                    className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                    required
                    value={approveForm.permanentAddress}
                    onChange={(e) => setApproveForm({ ...approveForm, permanentAddress: e.target.value })}
                  />
                </div>
              </div>

              {/* State */}
              <div className="form-group">
                <label className="form-label">State</label>
                <div className="relative flex items-center">
                  <Map size={15} className="absolute left-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. Punjab"
                    className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                    required
                    value={approveForm.state}
                    onChange={(e) => setApproveForm({ ...approveForm, state: e.target.value })}
                  />
                </div>
              </div>

              {/* Pincode */}
              <div className="form-group">
                <label className="form-label">Pincode</label>
                <div className="relative flex items-center">
                  <MapPin size={15} className="absolute left-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="6-digit ZIP code"
                    className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                    required
                    value={approveForm.pincode}
                    onChange={(e) => setApproveForm({ ...approveForm, pincode: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {approveForm.role === 'STAFF' && (
            <>
              {/* Department */}
              <div className="form-group">
                <label className="form-label">Department</label>
                <div className="relative flex items-center">
                  <Briefcase size={15} className="absolute left-4 text-slate-400 pointer-events-none z-10" />
                  <select
                    value={approveForm.department}
                    onChange={(e) => setApproveForm({ ...approveForm, department: e.target.value })}
                    className="w-full h-11 pl-10 pr-8 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="Warden">Warden Office</option>
                    <option value="Mess">Mess Committee</option>
                    <option value="Security">Security Guard</option>
                    <option value="Cleaning">Cleaning & Utility</option>
                    <option value="Maintenance">Maintenance Crew</option>
                  </select>
                  <div className="absolute right-4 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-slate-400 w-0 h-0" />
                </div>
              </div>

              {/* Designation */}
              <div className="form-group">
                <label className="form-label">Designation</label>
                <div className="relative flex items-center">
                  <Briefcase size={15} className="absolute left-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. Night Guard"
                    className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                    required
                    value={approveForm.designation}
                    onChange={(e) => setApproveForm({ ...approveForm, designation: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 full-width mt-4">
            <button
              type="button"
              className="h-11 px-6 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-[13px] font-bold cursor-pointer transition-all"
              onClick={() => setIsApproveModalOpen(false)}
              disabled={approving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-11 px-6 text-white rounded-xl font-bold text-[13px] cursor-pointer transition-all"
              style={{
                background: approving ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                boxShadow: approving ? 'none' : '0 4px 14px rgba(37,99,235,0.3)',
              }}
              disabled={approving}
            >
              {approving ? 'Approving User...' : 'Grant Access Rights'}
            </button>
          </div>
        </form>
      </CustomModal>
    </div>
  );
};

export default Approvals;

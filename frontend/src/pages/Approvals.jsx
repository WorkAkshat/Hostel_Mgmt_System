import { useState, useEffect } from 'react';
import { auth as authApi, rooms as roomsApi } from '../utils/api';
import {
  Check, X, ShieldAlert, Users, Calendar, Mail, Phone, Home, FileText,
  CheckSquare, XSquare, Plus, User, Heart, Map, MapPin, GraduationCap,
  Briefcase, ShieldCheck, Sparkles, Building, Layers, ZoomIn, Eye, Camera, Maximize2
} from 'lucide-react';
import CustomModal from '../components/CustomModal';

const INDIAN_STATES_AND_UTS = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal'
];

const Approvals = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Approval Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // { url, name }
  const [approveForm, setApproveForm] = useState({
    role: '',
    roomId: '',
    phoneNumber: '',
    parentContact: '',
    department: '',
    designation: '',
    dateOfJoining: '',
    maritalStatus: 'Unmarried',
    fatherName: '',
    dob: '',
    permanentAddress: '',
    state: '',
    pincode: '',
    coachingCollege: ''
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
      state: user.student?.state || 'Rajasthan',
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

  const getUserAvatar = (u, size = "w-11 h-11", textSize = "text-sm") => {
    const avatarUrl = u.avatar || u.student?.profilePic;
    if (avatarUrl) {
      return (
        <div
          className={`relative group cursor-pointer ${size} rounded-2xl overflow-hidden border-2 border-indigo-500/80 shadow-sm shrink-0 transition-transform duration-200 hover:scale-105`}
          onClick={(e) => {
            e.stopPropagation();
            setPreviewImage({ url: avatarUrl, name: u.name });
          }}
          title="Click to view full photo"
        >
          <img src={avatarUrl} alt={u.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <ZoomIn size={16} className="text-white drop-shadow-md" />
          </div>
        </div>
      );
    }
    return (
      <div className={`${size} rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-extrabold ${textSize} flex items-center justify-center shadow-sm shrink-0 border border-white/20`}>
        {u.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6 text-left">
      <div className="page-header">
        <h1 className="page-title">User Approvals Queue</h1>
        <p className="page-subtitle">
          Review pending user registrations, verify student background profiles, assign rooms, and authorize system access rights.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold">
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
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3 rounded-[28px]">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-sm">
            <ShieldCheck size={36} />
          </div>
          <h3 className="text-slate-800 font-bold text-lg">No Pending Registrations</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            All user registration requests have been reviewed and approved. There are no users waiting in the queue.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block custom-table-container rounded-[24px] overflow-hidden shadow-sm border border-slate-200/80">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Requested Role</th>
                  <th>Contact Info</th>
                  <th>Application Highlights</th>
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
                          {getUserAvatar(pUser)}
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
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                          reqRole === 'STUDENT' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {reqRole === 'STUDENT' ? <GraduationCap size={13} /> : <Briefcase size={13} />}
                          <span>{reqRole}</span>
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1 text-slate-600 text-xs font-medium">
                          <span className="flex items-center gap-1.5">
                            <Phone size={13} className="text-slate-400" />
                            <span>{pUser.student?.phoneNumber || pUser.staff?.phoneNumber}</span>
                          </span>
                          {pUser.student?.state && (
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <Map size={13} />
                              <span>{pUser.student.state}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {reqRole === 'STUDENT' ? (
                          <div className="flex flex-col gap-0.5 text-slate-500 text-xs">
                            <span>Father: <strong className="text-slate-800">{pUser.student?.fatherName || 'N/A'}</strong></span>
                            <span>College: <strong className="text-slate-800">{pUser.student?.coachingCollege || 'N/A'}</strong></span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5 text-slate-500 text-xs">
                            <span>Dept: <strong className="text-slate-800">{pUser.staff?.department || 'N/A'}</strong></span>
                            <span>Designation: <strong className="text-slate-800">{pUser.staff?.designation || 'N/A'}</strong></span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openApproveModal(pUser)}
                            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-all shadow-sm"
                          >
                            <Check size={14} />
                            <span>Review & Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(pUser.id, pUser.name)}
                            className="h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/60 flex items-center gap-1 text-rose-600 text-xs font-bold cursor-pointer transition-all"
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
                <div key={pUser.id} className="glass-card p-5 flex flex-col gap-4 rounded-[24px]">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      {getUserAvatar(pUser)}
                      <div className="flex flex-col">
                        <h4 className="text-sm font-bold text-slate-800">{pUser.name}</h4>
                        <span className="text-[11px] text-slate-500 font-medium truncate max-w-[160px]">{pUser.email}</span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      reqRole === 'STUDENT' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {reqRole}
                    </span>
                  </div>

                  <div className="h-[1px] bg-slate-100" />

                  <div className="flex flex-col gap-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Mobile Contact:</span>
                      <span className="font-semibold">{pUser.student?.phoneNumber || pUser.staff?.phoneNumber}</span>
                    </div>
                    {reqRole === 'STUDENT' ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Father's Name:</span>
                          <span className="font-semibold">{pUser.student?.fatherName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">College/Institute:</span>
                          <span className="font-semibold">{pUser.student?.coachingCollege}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">State:</span>
                          <span className="font-semibold">{pUser.student?.state}</span>
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
                      className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                    >
                      <Check size={15} />
                      <span>Review & Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(pUser.id, pUser.name)}
                      className="h-10 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-xl text-rose-600 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <X size={15} />
                      <span>Reject</span>
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
        title="Approve Candidate Registration"
        size="lg"
      >
        {approveError && (
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold mb-4">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{approveError}</span>
          </div>
        )}

        {/* Premium Profile Banner Card */}
        {selectedUser && (
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 shadow-md flex flex-col gap-4 text-left">
            <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-4">
                {selectedUser.avatar || selectedUser.student?.profilePic ? (
                  <div
                    className="relative group cursor-pointer w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-indigo-400 shadow-xl shrink-0 transition-transform duration-200 hover:scale-105"
                    onClick={() => setPreviewImage({ url: selectedUser.avatar || selectedUser.student?.profilePic, name: selectedUser.name })}
                    title="Click to view full profile photo"
                  >
                    <img
                      src={selectedUser.avatar || selectedUser.student?.profilePic}
                      alt={selectedUser.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity text-white text-[10px] font-bold">
                      <ZoomIn size={20} className="drop-shadow-md" />
                      <span>Enlarge Photo</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-extrabold text-3xl flex items-center justify-center border-2 border-white/20 shadow-xl shrink-0">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[19px] sm:text-[22px] font-bold text-white tracking-tight">{selectedUser.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      selectedUser.role.includes('STUDENT') ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40' : 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                    }`}>
                      {selectedUser.role.replace('PENDING_', '')}
                    </span>
                  </div>
                  <span className="text-[13px] text-slate-300 font-medium flex items-center gap-1.5">
                    <Mail size={13} className="text-indigo-400 shrink-0" />
                    <span>{selectedUser.email}</span>
                  </span>
                  <span className="text-[12px] text-slate-300 font-medium flex items-center gap-1.5">
                    <Phone size={13} className="text-emerald-400 shrink-0" />
                    <span>{selectedUser.student?.phoneNumber || selectedUser.staff?.phoneNumber}</span>
                  </span>

                  {(selectedUser.avatar || selectedUser.student?.profilePic) ? (
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: selectedUser.avatar || selectedUser.student?.profilePic, name: selectedUser.name })}
                      className="mt-1 self-start px-3 py-1 rounded-lg bg-indigo-600/60 hover:bg-indigo-600 border border-indigo-400/40 text-white text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>View Full Profile Photo</span>
                    </button>
                  ) : (
                    <span className="mt-1 self-start px-2.5 py-0.5 rounded-md bg-white/10 text-slate-400 text-[10px] font-semibold border border-white/10">
                      No Photo Uploaded
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Application Details Summary */}
            {selectedUser.role.includes('STUDENT') ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Father's Name</span>
                  <span className="font-semibold text-white truncate block">{selectedUser.student?.fatherName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Date of Birth</span>
                  <span className="font-semibold text-white truncate block">
                    {selectedUser.student?.dob ? new Date(selectedUser.student.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Joining Date</span>
                  <span className="font-semibold text-white truncate block">
                    {selectedUser.student?.dateOfJoining ? new Date(selectedUser.student.dateOfJoining).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">College / Coaching</span>
                  <span className="font-semibold text-white truncate block">{selectedUser.student?.coachingCollege || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">State & PIN</span>
                  <span className="font-semibold text-white truncate block">{selectedUser.student?.state || 'N/A'} ({selectedUser.student?.pincode || 'N/A'})</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Parent Contact</span>
                  <span className="font-semibold text-emerald-300 truncate block">{selectedUser.student?.parentContact || 'N/A'}</span>
                </div>
                {selectedUser.student?.permanentAddress && (
                  <div className="col-span-2 sm:col-span-3 pt-1 border-t border-white/10">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Permanent Address</span>
                    <span className="text-slate-200 text-[11px] leading-relaxed block">{selectedUser.student.permanentAddress}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Department</span>
                  <span className="font-semibold text-white">{selectedUser.staff?.department || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Designation</span>
                  <span className="font-semibold text-white">{selectedUser.staff?.designation || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleApproveSubmit} className="flex flex-col gap-4 text-left">
          {/* Final Role Switcher */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-indigo-600" />
              <span>Assign System Access Role *</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5 p-1 bg-slate-100 rounded-[14px]">
              {[
                { key: 'STUDENT', label: 'Student', desc: 'Resides in hostel' },
                { key: 'STAFF', label: 'Staff', desc: 'Staff portal only' },
                { key: 'ADMIN', label: 'Warden (Admin)', desc: 'Full admin rights' }
              ].map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setApproveForm({ ...approveForm, role: r.key })}
                  className={`py-2 px-1 rounded-[11px] font-bold text-[12px] border-none cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                    approveForm.role === r.key
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-[1px] bg-slate-100 my-1"></div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Contact Phone Number */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Mobile Number *</label>
              <div className="relative flex items-center">
                <Phone size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  className="w-full h-11 pl-9 sm:pl-10 pr-3.5 rounded-[12px] border border-slate-200 bg-white text-slate-800 outline-none text-[13px] sm:text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium"
                  required
                  value={approveForm.phoneNumber}
                  onChange={(e) => setApproveForm({ ...approveForm, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                />
              </div>
            </div>

            {approveForm.role === 'STUDENT' && (
              <>
                {/* Emergency Contact */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Parent / Emergency Contact *</label>
                  <div className="relative flex items-center">
                    <Phone size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="tel"
                      placeholder="Parent mobile number"
                      className="w-full h-11 pl-9 sm:pl-10 pr-3.5 rounded-[12px] border border-slate-200 bg-white text-slate-800 outline-none text-[13px] sm:text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium"
                      required
                      value={approveForm.parentContact}
                      onChange={(e) => setApproveForm({ ...approveForm, parentContact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    />
                  </div>
                </div>

                {/* Room Allocation */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Home size={14} className="text-indigo-600" />
                    <span>Assign Room Allocation</span>
                  </label>
                  <div className="relative flex items-center">
                    <Home size={15} className="absolute left-3.5 text-slate-400 pointer-events-none z-10" />
                    <select
                      value={approveForm.roomId}
                      onChange={(e) => setApproveForm({ ...approveForm, roomId: e.target.value })}
                      className="w-full h-11 pl-9 sm:pl-10 pr-8 rounded-[12px] border border-slate-200 bg-white text-slate-800 outline-none text-[13px] sm:text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium appearance-none cursor-pointer"
                    >
                      <option value="">No Allocation (Keep Unallocated for now)</option>
                      {rooms.map((room) => {
                        const bedsAvailable = room.sharingType - room.students.length;
                        return (
                          <option
                            key={room.id}
                            value={room.id}
                            disabled={room.status === 'FULL' || room.status === 'MAINTENANCE' || bedsAvailable <= 0}
                          >
                            Room {room.roomNumber} ({room.block}) - {room.isAc ? 'AC' : 'Non-AC'} &bull; {bedsAvailable > 0 ? `${bedsAvailable} bed(s) available` : 'FULL'}
                          </option>
                        );
                      })}
                    </select>
                    <div className="absolute right-3.5 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-slate-400 w-0 h-0" />
                  </div>
                </div>

                {/* Father's Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Father's Name *</label>
                  <div className="relative flex items-center">
                    <User size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Father's Full Name"
                      className="w-full h-11 pl-9 sm:pl-10 pr-3.5 rounded-[12px] border border-slate-200 bg-white text-slate-800 outline-none text-[13px] sm:text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium"
                      required
                      value={approveForm.fatherName}
                      onChange={(e) => setApproveForm({ ...approveForm, fatherName: e.target.value })}
                    />
                  </div>
                </div>

                {/* Date of Joining */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date of Joining *</label>
                  <div className="relative flex items-center">
                    <Calendar size={15} className="absolute left-3.5 text-slate-400 pointer-events-none z-10" />
                    <input
                      type="date"
                      className="w-full h-11 pl-9 sm:pl-10 pr-3.5 rounded-[12px] border border-slate-200 bg-white text-slate-800 outline-none text-[13px] sm:text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium cursor-pointer"
                      required
                      value={approveForm.dateOfJoining}
                      onChange={(e) => setApproveForm({ ...approveForm, dateOfJoining: e.target.value })}
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date of Birth *</label>
                  <div className="relative flex items-center">
                    <Calendar size={15} className="absolute left-3.5 text-slate-400 pointer-events-none z-10" />
                    <input
                      type="date"
                      className="w-full h-11 pl-9 sm:pl-10 pr-3.5 rounded-[12px] border border-slate-200 bg-white text-slate-800 outline-none text-[13px] sm:text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium cursor-pointer"
                      required
                      value={approveForm.dob}
                      onChange={(e) => setApproveForm({ ...approveForm, dob: e.target.value })}
                    />
                  </div>
                </div>

                {/* Marital Status */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Marital Status *</label>
                  <div className="relative flex items-center">
                    <Heart size={15} className="absolute left-3.5 text-slate-400 pointer-events-none z-10" />
                    <select
                      value={approveForm.maritalStatus}
                      onChange={(e) => setApproveForm({ ...approveForm, maritalStatus: e.target.value })}
                      className="w-full h-11 pl-9 sm:pl-10 pr-8 rounded-[12px] border border-slate-200 bg-white text-slate-800 outline-none text-[13px] sm:text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium appearance-none cursor-pointer"
                    >
                      <option value="Unmarried">Unmarried</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                    </select>
                    <div className="absolute right-3.5 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-slate-400 w-0 h-0" />
                  </div>
                </div>

                {/* College / Coaching Name */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">College / Coaching Institute *</label>
                  <div className="relative flex items-center">
                    <GraduationCap size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. Allen Institute / University of Rajasthan"
                      className="w-full h-11 pl-9 sm:pl-10 pr-3.5 rounded-[12px] border border-slate-200 bg-white text-slate-800 outline-none text-[13px] sm:text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium"
                      required
                      value={approveForm.coachingCollege}
                      onChange={(e) => setApproveForm({ ...approveForm, coachingCollege: e.target.value })}
                    />
                  </div>
                </div>

                {/* Permanent Address */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Permanent Address *</label>
                  <div className="relative flex items-center">
                    <MapPin size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="House No, Street, Village/Town"
                      className="w-full h-11 pl-9 sm:pl-10 pr-3.5 rounded-[12px] border border-slate-200 bg-white text-slate-800 outline-none text-[13px] sm:text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium"
                      required
                      value={approveForm.permanentAddress}
                      onChange={(e) => setApproveForm({ ...approveForm, permanentAddress: e.target.value })}
                    />
                  </div>
                </div>

                {/* State Select Dropdown */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">State / Union Territory *</label>
                  <div className="relative flex items-center">
                    <Map size={15} className="absolute left-3.5 text-slate-400 pointer-events-none z-10" />
                    <select
                      value={approveForm.state}
                      onChange={(e) => setApproveForm({ ...approveForm, state: e.target.value })}
                      className="w-full h-11 pl-9 sm:pl-10 pr-8 rounded-[12px] border border-slate-200 bg-white text-slate-800 outline-none text-[13px] sm:text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium appearance-none cursor-pointer"
                    >
                      {INDIAN_STATES_AND_UTS.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                    <div className="absolute right-3.5 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-slate-400 w-0 h-0" />
                  </div>
                </div>

                {/* Pincode */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pincode *</label>
                  <div className="relative flex items-center">
                    <MapPin size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="6-digit PIN code"
                      className="w-full h-11 pl-9 sm:pl-10 pr-3.5 rounded-[12px] border border-slate-200 bg-white text-slate-800 outline-none text-[13px] sm:text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium"
                      required
                      value={approveForm.pincode}
                      onChange={(e) => setApproveForm({ ...approveForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    />
                  </div>
                </div>
              </>
            )}

            {approveForm.role === 'STAFF' && (
              <>
                {/* Department */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Department *</label>
                  <div className="relative flex items-center">
                    <Briefcase size={15} className="absolute left-3.5 text-slate-400 pointer-events-none z-10" />
                    <select
                      value={approveForm.department}
                      onChange={(e) => setApproveForm({ ...approveForm, department: e.target.value })}
                      className="w-full h-11 pl-9 sm:pl-10 pr-8 rounded-[12px] border border-slate-200 bg-white text-slate-800 outline-none text-[13px] sm:text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium appearance-none cursor-pointer"
                    >
                      <option value="Warden">Warden Office</option>
                      <option value="Mess">Mess Committee</option>
                      <option value="Security">Security Guard</option>
                      <option value="Cleaning">Cleaning & Utility</option>
                      <option value="Maintenance">Maintenance Crew</option>
                    </select>
                    <div className="absolute right-3.5 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-slate-400 w-0 h-0" />
                  </div>
                </div>

                {/* Designation */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Designation *</label>
                  <div className="relative flex items-center">
                    <Briefcase size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. Night Guard"
                      className="w-full h-11 pl-9 sm:pl-10 pr-3.5 rounded-[12px] border border-slate-200 bg-white text-slate-800 outline-none text-[13px] sm:text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 transition-all font-medium"
                      required
                      value={approveForm.designation}
                      onChange={(e) => setApproveForm({ ...approveForm, designation: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 w-full mt-3">
            <button
              type="button"
              className="h-11 px-5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-[13px] font-bold cursor-pointer transition-all"
              onClick={() => setIsApproveModalOpen(false)}
              disabled={approving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-11 px-6 text-white rounded-xl font-bold text-[13px] cursor-pointer transition-all flex items-center gap-2 shadow-md"
              style={{
                background: approving ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                boxShadow: approving ? 'none' : '0 4px 14px rgba(37,99,235,0.3)',
              }}
              disabled={approving}
            >
              {approving ? (
                <span>Approving User...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>Grant Access & Approve Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </CustomModal>

      {/* PHOTO PREVIEW LIGHTBOX MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 rounded-3xl p-5 border border-white/10 shadow-2xl flex flex-col items-center gap-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between px-2 pt-1 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-indigo-400" />
                <h4 className="font-bold text-base text-white">{previewImage.name} — Profile Photo</h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border-none"
              >
                <X size={18} />
              </button>
            </div>
            <div className="w-full max-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/60 p-2 border border-white/5">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            </div>
            <div className="flex items-center gap-3">
              <a
                href={previewImage.url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md no-underline flex items-center gap-1.5"
              >
                <Maximize2 size={14} />
                <span>Open Original Image</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border-none cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;

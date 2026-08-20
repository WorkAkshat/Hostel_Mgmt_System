import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth as authApi } from '../utils/api';
import { UserPlus, Key, Mail, ShieldAlert, Home, User, CheckCircle2, Phone, Briefcase, GraduationCap, Calendar, Heart, MapPin, Map } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  
  // Student specific details

  const [studentPhone, setStudentPhone] = useState('');
  const [parentContact, setParentContact] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Unmarried');
  const [fatherName, setFatherName] = useState('');
  const [dob, setDob] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [coachingCollege, setCoachingCollege] = useState('');

  // Staff specific details
  const [department, setDepartment] = useState('Security');
  const [designation, setDesignation] = useState('');
  const [staffPhone, setStaffPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!name || !email || !password || !confirmPassword || !role) {
      setError('Please fill in all general fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    const payload = {
      name,
      email,
      password,
      role
    };

    if (role === 'STUDENT') {
      if (
        !studentPhone || 
        !parentContact || 
        !dateOfJoining || 
        !maritalStatus || 
        !fatherName || 
        !dob || 
        !permanentAddress || 
        !state || 
        !pincode || 
        !coachingCollege
      ) {
        setError('Please fill in all student information fields.');
        return;
      }
      if (studentPhone.length !== 10 || parentContact.length !== 10) {
        setError('Contact and emergency/parent phone numbers must be exactly 10 digits.');
        return;
      }
      payload.phoneNumber = studentPhone;
      payload.parentContact = parentContact;
      payload.dateOfJoining = dateOfJoining;
      payload.maritalStatus = maritalStatus;
      payload.fatherName = fatherName;
      payload.dob = dob;
      payload.permanentAddress = permanentAddress;
      payload.state = state;
      payload.pincode = pincode;
      payload.coachingCollege = coachingCollege;
    } else {
      if (!department || !designation || !staffPhone) {
        setError('Please fill in all staff information fields.');
        return;
      }
      if (staffPhone.length !== 10) {
        setError('Contact number must be exactly 10 digits.');
        return;
      }
      payload.department = department;
      payload.designation = designation;
      payload.phoneNumber = staffPhone;
    }

    setLoading(true);
    try {
      await authApi.register(payload);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className="min-h-screen w-screen flex items-center justify-center relative overflow-hidden"
        style={{
          background: 'radial-gradient(circle at top left, rgba(16,185,129,0.1), transparent 40%), radial-gradient(circle at bottom right, rgba(99,102,241,0.1), transparent 35%), linear-gradient(135deg, #F8FAFF 0%, #EEF4FF 30%, #FDFBFF 60%, #F5F8FF 100%)',
        }}
      >
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{background: 'radial-gradient(circle, rgba(16,185,129,0.07), transparent)', filter: 'blur(60px)'}} />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{background: 'radial-gradient(circle, rgba(99,102,241,0.07), transparent)', filter: 'blur(60px)'}} />

        <div
          className="w-full max-w-[480px] p-8 md:p-10 rounded-[28px] text-center flex flex-col items-center gap-6 relative z-10 mx-4"
          style={{
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 20px 60px rgba(15,23,42,0.08)',
          }}
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <h2 className="text-[24px] font-bold text-slate-800 tracking-tight">Request Submitted!</h2>
            <p className="text-[14px] text-slate-500 font-medium mt-3 leading-relaxed">
              Hi, <span className="font-bold text-slate-700">{name}</span>. Your account registration request has been successfully received. 
            </p>
            <p className="text-[13px] text-slate-400 font-medium mt-2 leading-relaxed">
              An administrator (Chief Warden) must approve your profile before you can log in. You will receive an authorization error if you try to sign in prior to approval.
            </p>
          </div>

          <div className="w-full h-[1px] bg-slate-100 my-1"></div>

          <Link
            to="/login"
            className="w-full h-12 text-white rounded-[14px] font-bold flex items-center justify-center gap-2 transition-all text-[14px]"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
            }}
          >
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center relative overflow-hidden py-12"
      style={{
        background: 'radial-gradient(circle at top left, rgba(59,130,246,0.1), transparent 40%), radial-gradient(circle at bottom right, rgba(139,92,246,0.1), transparent 35%), linear-gradient(135deg, #F8FAFF 0%, #EEF4FF 30%, #FDFBFF 60%, #F5F8FF 100%)',
      }}
    >
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{background: 'radial-gradient(circle, rgba(37,99,235,0.07), transparent)', filter: 'blur(60px)'}} />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{background: 'radial-gradient(circle, rgba(139,92,246,0.07), transparent)', filter: 'blur(60px)'}} />

      <div className="relative z-10 w-full flex flex-col items-center justify-center px-4 max-w-[620px] mx-auto">
        {/* Branding header */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shadow-md" style={{background: 'linear-gradient(135deg, #2563eb, #4f46e5)'}}>
            <Home size={18} className="text-white" />
          </div>
          <h2 className="text-[18px] font-bold text-slate-800 tracking-tight">Hari Pushp PG</h2>
        </div>

        {/* Card */}
        <div
          className="w-full p-8 md:p-10 rounded-[28px] animate-fade-in flex flex-col"
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 20px 60px rgba(15,23,42,0.1)',
          }}
        >
          {/* Header */}
          <div className="flex flex-col mb-6">
            <h2 className="text-[22px] font-bold text-slate-800 tracking-tight">Create Account</h2>
            <p className="text-[13px] text-slate-500 font-medium mt-1">Register to request residential access rights</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-[14px] border border-red-200 bg-red-50 text-red-600 text-[13px] font-semibold mb-5 animate-fade-in">
              <ShieldAlert size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <div className="relative flex items-center">
                  <User size={15} className="absolute left-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative flex items-center">
                  <Mail size={15} className="absolute left-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="jane@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <div className="relative flex items-center">
                  <Key size={15} className="absolute left-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                <div className="relative flex items-center">
                  <Key size={15} className="absolute left-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Role Switcher */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Register As</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-[14px]">
                <button
                  type="button"
                  onClick={() => setRole('STUDENT')}
                  className={`py-2 rounded-[11px] font-bold text-[13px] border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                    role === 'STUDENT'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'bg-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <GraduationCap size={16} />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('STAFF')}
                  className={`py-2 rounded-[11px] font-bold text-[13px] border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                    role === 'STAFF'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'bg-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Briefcase size={16} />
                  <span>Staff</span>
                </button>
              </div>
            </div>

            <div className="w-full h-[1px] bg-slate-100 my-1"></div>

            {/* Conditional Sub-forms */}
            {role === 'STUDENT' ? (
              <div className="flex flex-col gap-4 animate-fade-in text-left">
                <h4 className="text-[14px] font-bold text-slate-700 flex items-center gap-2 mt-2">
                  <GraduationCap size={16} className="text-blue-500" />
                  <span>Student Enrollment Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Student Phone */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Your Contact Number</label>
                    <div className="relative flex items-center">
                      <Phone size={15} className="absolute left-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="10-digit number"
                        value={studentPhone}
                        onChange={(e) => setStudentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        disabled={loading}
                        className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Parent Contact */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Emergency/Parent Contact</label>
                    <div className="relative flex items-center">
                      <Phone size={15} className="absolute left-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Emergency contact"
                        value={parentContact}
                        onChange={(e) => setParentContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        disabled={loading}
                        className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Date of Joining */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date of Joining</label>
                    <div className="relative flex items-center">
                      <Calendar size={15} className="absolute left-4 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={dateOfJoining}
                        onChange={(e) => setDateOfJoining(e.target.value)}
                        disabled={loading}
                        className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* DOB */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                    <div className="relative flex items-center">
                      <Calendar size={15} className="absolute left-4 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        disabled={loading}
                        className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Father's Name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Father's Name</label>
                    <div className="relative flex items-center">
                      <User size={15} className="absolute left-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Father's Full Name"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        disabled={loading}
                        className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Marital Status */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Marital Status</label>
                    <div className="relative flex items-center">
                      <Heart size={15} className="absolute left-4 text-slate-400 pointer-events-none z-10" />
                      <select
                        value={maritalStatus}
                        onChange={(e) => setMaritalStatus(e.target.value)}
                        disabled={loading}
                        className="w-full h-11 pl-10 pr-8 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium appearance-none cursor-pointer"
                      >
                        <option value="Unmarried">Unmarried</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                      </select>
                      <div className="absolute right-4 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-slate-400 w-0 h-0" />
                    </div>
                  </div>

                  {/* College / Coaching Name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">College / Coaching Name</label>
                    <div className="relative flex items-center">
                      <GraduationCap size={15} className="absolute left-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="College/Coaching name"
                        value={coachingCollege}
                        onChange={(e) => setCoachingCollege(e.target.value)}
                        disabled={loading}
                        className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Permanent Address */}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Permanent Address</label>
                    <div className="relative flex items-center">
                      <MapPin size={15} className="absolute left-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="House/Street, Locality"
                        value={permanentAddress}
                        onChange={(e) => setPermanentAddress(e.target.value)}
                        disabled={loading}
                        className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* State */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">State</label>
                    <div className="relative flex items-center">
                      <Map size={15} className="absolute left-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Punjab"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        disabled={loading}
                        className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Pincode */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pincode</label>
                    <div className="relative flex items-center">
                      <MapPin size={15} className="absolute left-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="6-digit ZIP code"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        disabled={loading}
                        className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-fade-in text-left">
                <h4 className="text-[14px] font-bold text-slate-700 flex items-center gap-2 mt-2">
                  <Briefcase size={16} className="text-blue-500" />
                  <span>Staff Work Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Department</label>
                    <div className="relative flex items-center">
                      <Briefcase size={15} className="absolute left-4 text-slate-400 pointer-events-none z-10" />
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        disabled={loading}
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
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Designation</label>
                    <div className="relative flex items-center">
                      <Briefcase size={15} className="absolute left-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Night Guard"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        disabled={loading}
                        className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Number</label>
                    <div className="relative flex items-center">
                      <Phone size={15} className="absolute left-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="10-digit number"
                        value={staffPhone}
                        onChange={(e) => setStaffPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        disabled={loading}
                        className="w-full h-11 pl-10 pr-4 rounded-[12px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-white rounded-[14px] font-bold flex items-center justify-center gap-2 transition-all text-[14px] cursor-pointer mt-3"
              style={{
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(37,99,235,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                color: '#ffffff',
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? (
                <span>Submitting request...</span>
              ) : (
                <>
                  <span>Submit Registration Request</span>
                  <UserPlus size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick links */}
          <div className="flex items-center justify-center gap-1.5 mt-6 text-[13px] font-medium text-slate-500">
            <span>Already have an account?</span>
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold underline">
              Sign In
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[12px] text-slate-400 font-medium mt-6">
          Hari Pushp PG &mdash; Enterprise Hostel Management Platform
        </p>
      </div>
    </div>
  );
};

export default Register;

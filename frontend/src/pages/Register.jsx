import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth as authApi } from '../utils/api';
import {
  UserPlus, Key, Mail, ShieldAlert, Home, User, CheckCircle2, Phone,
  Briefcase, GraduationCap, Calendar, Heart, MapPin, Map, Camera, Upload,
  Crop, RotateCw, ZoomIn, ZoomOut, Check, X, Sliders, Eye, EyeOff
} from 'lucide-react';

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

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState('STUDENT');
  const [profilePic, setProfilePic] = useState(null);

  // Raw uploaded image before cropping
  const [rawImage, setRawImage] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);

  // Dragging state for touch/mouse pointer gestures
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialOffsetX: 0, initialOffsetY: 0 });

  const canvasRef = useRef(null);

  // Student specific details
  const [studentPhone, setStudentPhone] = useState('');
  const [parentContact, setParentContact] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Unmarried');
  const [fatherName, setFatherName] = useState('');
  const [dob, setDob] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [state, setState] = useState('Rajasthan');
  const [pincode, setPincode] = useState('');
  const [coachingCollege, setCoachingCollege] = useState('');

  // Staff specific details
  const [department, setDepartment] = useState('Security');
  const [designation, setDesignation] = useState('');
  const [staffPhone, setStaffPhone] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  // Helper validation function for required fields
  const getFieldError = (field) => {
    if (!submitted) return null;

    switch (field) {
      case 'name':
        return !name.trim() ? 'Full Name is required' : null;
      case 'email':
        if (!email.trim()) return 'Email Address is required';
        if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email address';
        return null;
      case 'password':
        if (!password) return 'Password is required';
        if (password.length < 6) return 'Must be at least 6 characters';
        return null;
      case 'confirmPassword':
        if (!confirmPassword) return 'Please confirm your password';
        if (confirmPassword !== password) return 'Passwords do not match';
        return null;
      case 'studentPhone':
        if (role === 'STUDENT') {
          if (!studentPhone) return 'Mobile number is required';
          if (studentPhone.length !== 10) return 'Must be exactly 10 digits';
        }
        return null;
      case 'parentContact':
        if (role === 'STUDENT') {
          if (!parentContact) return 'Parent contact number is required';
          if (parentContact.length !== 10) return 'Must be exactly 10 digits';
        }
        return null;
      case 'dateOfJoining':
        return role === 'STUDENT' && !dateOfJoining ? 'Date of joining is required' : null;
      case 'dob':
        return role === 'STUDENT' && !dob ? 'Date of birth is required' : null;
      case 'fatherName':
        return role === 'STUDENT' && !fatherName.trim() ? "Father's name is required" : null;
      case 'maritalStatus':
        return role === 'STUDENT' && !maritalStatus ? 'Marital status is required' : null;
      case 'coachingCollege':
        return role === 'STUDENT' && !coachingCollege.trim() ? 'College or coaching institute is required' : null;
      case 'permanentAddress':
        return role === 'STUDENT' && !permanentAddress.trim() ? 'Permanent address is required' : null;
      case 'state':
        return role === 'STUDENT' && !state ? 'State / UT is required' : null;
      case 'pincode':
        if (role === 'STUDENT') {
          if (!pincode) return 'Pincode is required';
          if (pincode.length !== 6) return 'Must be exactly 6 digits';
        }
        return null;
      case 'department':
        return role === 'STAFF' && !department ? 'Department is required' : null;
      case 'designation':
        return role === 'STAFF' && !designation.trim() ? 'Designation is required' : null;
      case 'staffPhone':
        if (role === 'STAFF') {
          if (!staffPhone) return 'Contact mobile number is required';
          if (staffPhone.length !== 10) return 'Must be exactly 10 digits';
        }
        return null;
      default:
        return null;
    }
  };

  const getInputStyleClass = (field, extraPaddingRight = false) => {
    const hasErr = !!getFieldError(field);
    const prClass = extraPaddingRight ? 'pr-10' : 'pr-3.5';
    return `w-full h-11 pl-9 sm:pl-10 ${prClass} rounded-[12px] border outline-none text-[13px] sm:text-[14px] font-medium transition-all ${
      hasErr
        ? 'border-red-500 bg-red-50/40 text-red-900 ring-2 ring-red-100 placeholder-red-400'
        : 'border-slate-200 bg-white/90 text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50'
    }`;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setError('Profile picture file size must be less than 8MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImage(reader.result);
        setCropZoom(1);
        setCropRotation(0);
        setCropOffsetX(0);
        setCropOffsetY(0);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Touch and mouse drag handlers for finger gestures
  const handlePointerDown = (clientX, clientY) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      initialOffsetX: cropOffsetX,
      initialOffsetY: cropOffsetY,
    };
  };

  const handlePointerMove = (clientX, clientY) => {
    if (!isDragging) return;
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;
    setCropOffsetX(dragStartRef.current.initialOffsetX + deltaX);
    setCropOffsetY(dragStartRef.current.initialOffsetY + deltaY);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Draw crop preview on modal canvas
  useEffect(() => {
    if (!showCropModal || !rawImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = rawImage;
    img.onload = () => {
      const size = 280;
      canvas.width = size;
      canvas.height = size;
      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((cropRotation * Math.PI) / 180);
      ctx.scale(cropZoom, cropZoom);
      ctx.translate(cropOffsetX, cropOffsetY);

      const aspect = img.width / img.height;
      let drawW, drawH;
      if (aspect > 1) {
        drawH = size;
        drawW = size * aspect;
      } else {
        drawW = size;
        drawH = size / aspect;
      }
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    };
  }, [showCropModal, rawImage, cropZoom, cropRotation, cropOffsetX, cropOffsetY]);

  const applyCroppedImage = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setProfilePic(croppedDataUrl);
    setShowCropModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setError(null);

    // Validate general fields
    const nameErr = getFieldError('name');
    const emailErr = getFieldError('email');
    const pwdErr = getFieldError('password');
    const confirmErr = getFieldError('confirmPassword');

    if (nameErr || emailErr || pwdErr || confirmErr) {
      setError('Please fix the highlighted fields in red before submitting.');
      return;
    }

    const payload = {
      name,
      email,
      password,
      role,
      profilePic
    };

    if (role === 'STUDENT') {
      const sPhoneErr = getFieldError('studentPhone');
      const pContactErr = getFieldError('parentContact');
      const dojErr = getFieldError('dateOfJoining');
      const dobErr = getFieldError('dob');
      const fatherErr = getFieldError('fatherName');
      const collegeErr = getFieldError('coachingCollege');
      const addrErr = getFieldError('permanentAddress');
      const stateErr = getFieldError('state');
      const pinErr = getFieldError('pincode');

      if (
        sPhoneErr || pContactErr || dojErr || dobErr ||
        fatherErr || collegeErr || addrErr || stateErr || pinErr
      ) {
        setError('Please fill in all student information fields correctly (highlighted in red).');
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
      const deptErr = getFieldError('department');
      const desigErr = getFieldError('designation');
      const phoneErr = getFieldError('staffPhone');

      if (deptErr || desigErr || phoneErr) {
        setError('Please fill in all staff information fields correctly (highlighted in red).');
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
        className="min-h-screen w-full flex items-center justify-center relative overflow-y-auto px-4 py-8 sm:py-12"
        style={{
          background: 'radial-gradient(circle at top left, rgba(16,185,129,0.1), transparent 40%), radial-gradient(circle at bottom right, rgba(99,102,241,0.1), transparent 35%), linear-gradient(135deg, #F8FAFF 0%, #EEF4FF 30%, #FDFBFF 60%, #F5F8FF 100%)',
        }}
      >
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.07), transparent)', filter: 'blur(60px)' }} />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.07), transparent)', filter: 'blur(60px)' }} />

        <div
          className="w-full max-w-[480px] p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-[28px] text-center flex flex-col items-center gap-5 sm:gap-6 relative z-10 mx-auto"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.8)',
            boxShadow: '0 20px 60px rgba(15,23,42,0.08)',
          }}
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner">
            <CheckCircle2 size={32} className="sm:w-9 sm:h-9" />
          </div>
          <div>
            <h2 className="text-[20px] sm:text-[24px] font-bold text-slate-800 tracking-tight">Request Submitted!</h2>
            <p className="text-[13px] sm:text-[14px] text-slate-600 font-medium mt-2 leading-relaxed">
              Hi, <span className="font-bold text-slate-800">{name}</span>. Your registration details have been received successfully.
            </p>
            <p className="text-[12px] sm:text-[13px] text-slate-500 font-medium mt-2 leading-relaxed">
              Hostel administration will review and approve your account. You can log in once approved.
            </p>
          </div>

          <div className="w-full h-[1px] bg-slate-100 my-1"></div>

          <Link
            to="/login"
            className="w-full h-11 sm:h-12 text-white rounded-[14px] font-bold flex items-center justify-center gap-2 transition-all text-[14px]"
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
      className="min-h-screen w-full flex flex-col items-center justify-start sm:justify-center relative overflow-y-auto px-3 sm:px-6 md:px-8 py-8 sm:py-12"
      style={{
        background: 'radial-gradient(circle at top left, rgba(59,130,246,0.1), transparent 40%), radial-gradient(circle at bottom right, rgba(139,92,246,0.1), transparent 35%), linear-gradient(135deg, #F8FAFF 0%, #EEF4FF 30%, #FDFBFF 60%, #F5F8FF 100%)',
      }}
    >
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.07), transparent)', filter: 'blur(60px)' }} />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.07), transparent)', filter: 'blur(60px)' }} />

      <div className="relative z-10 w-full max-w-[680px] mx-auto flex flex-col items-center">
        {/* Branding header */}
        <div className="flex items-center gap-2.5 sm:gap-3 justify-center mb-4 sm:mb-6">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[14px] flex items-center justify-center shadow-md shrink-0" style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
            <Home size={18} className="text-white" />
          </div>
          <h2 className="text-[17px] sm:text-[20px] font-bold text-slate-800 tracking-tight">Hari Pushp PG Hostel</h2>
        </div>

        {/* Form Card */}
        <div
          className="w-full p-4 sm:p-8 md:p-10 rounded-2xl sm:rounded-[28px] flex flex-col"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.8)',
            boxShadow: '0 20px 60px rgba(15,23,42,0.08)',
          }}
        >
          {/* Header */}
          <div className="flex flex-col mb-5 sm:mb-6 text-center sm:text-left">
            <h2 className="text-[20px] sm:text-[24px] font-bold text-slate-800 tracking-tight">Student & Staff Registration</h2>
            <p className="text-[12px] sm:text-[13px] text-slate-500 font-medium mt-1">Fill out your official details for hostel admission</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-[14px] border border-red-200 bg-red-50 text-red-600 text-[12px] sm:text-[13px] font-semibold mb-5">
              <ShieldAlert size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Profile Picture Uploader */}
          <div className="flex flex-col items-center justify-center mb-5 sm:mb-6 p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100/90 text-center">
            <div className="relative group cursor-pointer mb-2">
              {profilePic ? (
                <img src={profilePic} alt="Profile Preview" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-md" />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center border-4 border-white shadow-md">
                  <User size={36} />
                </div>
              )}
              <label htmlFor="profile-pic-input" className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md cursor-pointer hover:bg-indigo-700 transition-all">
                <Camera size={15} />
              </label>
              <input id="profile-pic-input" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              <label htmlFor="profile-pic-input" className="text-[12px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer underline">
                {profilePic ? 'Change Photo' : 'Upload Profile Photo'}
              </label>
              {profilePic && (
                <button
                  type="button"
                  onClick={() => setShowCropModal(true)}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1 shadow-xs"
                >
                  <Crop size={12} />
                  <span>Adjust / Crop</span>
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-1">JPG or PNG (Max 8MB)</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Name *</label>
                <div className="relative flex items-center">
                  <User size={15} className={`absolute left-3.5 pointer-events-none ${getFieldError('name') ? 'text-red-400' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    placeholder="e.g. Ananya Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className={getInputStyleClass('name')}
                  />
                </div>
                {getFieldError('name') && (
                  <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('name')}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address *</label>
                <div className="relative flex items-center">
                  <Mail size={15} className={`absolute left-3.5 pointer-events-none ${getFieldError('email') ? 'text-red-400' : 'text-slate-400'}`} />
                  <input
                    type="email"
                    placeholder="ananya@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className={getInputStyleClass('email')}
                  />
                </div>
                {getFieldError('email') && (
                  <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('email')}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password *</label>
                <div className="relative flex items-center">
                  <Key size={15} className={`absolute left-3.5 pointer-events-none ${getFieldError('password') ? 'text-red-400' : 'text-slate-400'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className={getInputStyleClass('password', true)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-full cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {getFieldError('password') && (
                  <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('password')}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Confirm Password *</label>
                <div className="relative flex items-center">
                  <Key size={15} className={`absolute left-3.5 pointer-events-none ${getFieldError('confirmPassword') ? 'text-red-400' : 'text-slate-400'}`} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className={getInputStyleClass('confirmPassword', true)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-full cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {getFieldError('confirmPassword') && (
                  <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('confirmPassword')}</span>
                )}
              </div>
            </div>

            {/* Role Switcher */}
            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Register As</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-[14px]">
                <button
                  type="button"
                  onClick={() => setRole('STUDENT')}
                  className={`py-2 rounded-[11px] font-bold text-[13px] border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 ${role === 'STUDENT'
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
                  className={`py-2 rounded-[11px] font-bold text-[13px] border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 ${role === 'STAFF'
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
              <div className="flex flex-col gap-3.5 sm:gap-4 text-left">
                <h4 className="text-[13px] sm:text-[14px] font-bold text-slate-700 flex items-center gap-2 mt-1">
                  <GraduationCap size={16} className="text-blue-500" />
                  <span>Student Enrollment Information</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  {/* Student Phone */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Your Mobile Number *</label>
                    <div className="relative flex items-center">
                      <Phone size={15} className={`absolute left-3.5 pointer-events-none ${getFieldError('studentPhone') ? 'text-red-400' : 'text-slate-400'}`} />
                      <input
                        type="tel"
                        placeholder="10-digit mobile"
                        value={studentPhone}
                        onChange={(e) => setStudentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        disabled={loading}
                        className={getInputStyleClass('studentPhone')}
                      />
                    </div>
                    {getFieldError('studentPhone') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('studentPhone')}</span>
                    )}
                  </div>

                  {/* Parent Contact */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Parent/Emergency Contact *</label>
                    <div className="relative flex items-center">
                      <Phone size={15} className={`absolute left-3.5 pointer-events-none ${getFieldError('parentContact') ? 'text-red-400' : 'text-slate-400'}`} />
                      <input
                        type="tel"
                        placeholder="Parent mobile number"
                        value={parentContact}
                        onChange={(e) => setParentContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        disabled={loading}
                        className={getInputStyleClass('parentContact')}
                      />
                    </div>
                    {getFieldError('parentContact') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('parentContact')}</span>
                    )}
                  </div>

                  {/* Date of Joining */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date of Joining *</label>
                    <div className="relative flex items-center">
                      <Calendar size={15} className={`absolute left-3.5 pointer-events-none z-10 ${getFieldError('dateOfJoining') ? 'text-red-400' : 'text-slate-400'}`} />
                      <input
                        type="date"
                        value={dateOfJoining}
                        onChange={(e) => setDateOfJoining(e.target.value)}
                        disabled={loading}
                        className={getInputStyleClass('dateOfJoining')}
                      />
                    </div>
                    {getFieldError('dateOfJoining') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('dateOfJoining')}</span>
                    )}
                  </div>

                  {/* DOB */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date of Birth *</label>
                    <div className="relative flex items-center">
                      <Calendar size={15} className={`absolute left-3.5 pointer-events-none z-10 ${getFieldError('dob') ? 'text-red-400' : 'text-slate-400'}`} />
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        disabled={loading}
                        className={getInputStyleClass('dob')}
                      />
                    </div>
                    {getFieldError('dob') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('dob')}</span>
                    )}
                  </div>

                  {/* Father's Name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Father's Name *</label>
                    <div className="relative flex items-center">
                      <User size={15} className={`absolute left-3.5 pointer-events-none ${getFieldError('fatherName') ? 'text-red-400' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        placeholder="Father's Full Name"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        disabled={loading}
                        className={getInputStyleClass('fatherName')}
                      />
                    </div>
                    {getFieldError('fatherName') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('fatherName')}</span>
                    )}
                  </div>

                  {/* Marital Status */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Marital Status *</label>
                    <div className="relative flex items-center">
                      <Heart size={15} className={`absolute left-3.5 pointer-events-none z-10 ${getFieldError('maritalStatus') ? 'text-red-400' : 'text-slate-400'}`} />
                      <select
                        value={maritalStatus}
                        onChange={(e) => setMaritalStatus(e.target.value)}
                        disabled={loading}
                        className={`w-full h-11 pl-9 sm:pl-10 pr-8 rounded-[12px] border outline-none text-[13px] sm:text-[14px] font-medium appearance-none cursor-pointer transition-all ${
                          getFieldError('maritalStatus')
                            ? 'border-red-500 bg-red-50/40 text-red-900 ring-2 ring-red-100'
                            : 'border-slate-200 bg-white/90 text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50'
                        }`}
                      >
                        <option value="Unmarried">Unmarried</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                      </select>
                      <div className="absolute right-3.5 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-slate-400 w-0 h-0" />
                    </div>
                    {getFieldError('maritalStatus') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('maritalStatus')}</span>
                    )}
                  </div>

                  {/* College / Coaching Name */}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">College / Coaching Institute *</label>
                    <div className="relative flex items-center">
                      <GraduationCap size={15} className={`absolute left-3.5 pointer-events-none ${getFieldError('coachingCollege') ? 'text-red-400' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        placeholder="e.g. Allen Institute / University of Rajasthan"
                        value={coachingCollege}
                        onChange={(e) => setCoachingCollege(e.target.value)}
                        disabled={loading}
                        className={getInputStyleClass('coachingCollege')}
                      />
                    </div>
                    {getFieldError('coachingCollege') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('coachingCollege')}</span>
                    )}
                  </div>

                  {/* Permanent Address */}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Permanent Address *</label>
                    <div className="relative flex items-center">
                      <MapPin size={15} className={`absolute left-3.5 pointer-events-none ${getFieldError('permanentAddress') ? 'text-red-400' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        placeholder="House No, Street, Village/Town"
                        value={permanentAddress}
                        onChange={(e) => setPermanentAddress(e.target.value)}
                        disabled={loading}
                        className={getInputStyleClass('permanentAddress')}
                      />
                    </div>
                    {getFieldError('permanentAddress') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('permanentAddress')}</span>
                    )}
                  </div>

                  {/* State Select Dropdown (A to Z) */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">State / Union Territory *</label>
                    <div className="relative flex items-center">
                      <Map size={15} className={`absolute left-3.5 pointer-events-none z-10 ${getFieldError('state') ? 'text-red-400' : 'text-slate-400'}`} />
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        disabled={loading}
                        className={`w-full h-11 pl-9 sm:pl-10 pr-8 rounded-[12px] border outline-none text-[13px] sm:text-[14px] font-medium appearance-none cursor-pointer transition-all ${
                          getFieldError('state')
                            ? 'border-red-500 bg-red-50/40 text-red-900 ring-2 ring-red-100'
                            : 'border-slate-200 bg-white/90 text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50'
                        }`}
                      >
                        {INDIAN_STATES_AND_UTS.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-slate-400 w-0 h-0" />
                    </div>
                    {getFieldError('state') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('state')}</span>
                    )}
                  </div>

                  {/* Pincode */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pincode *</label>
                    <div className="relative flex items-center">
                      <MapPin size={15} className={`absolute left-3.5 pointer-events-none ${getFieldError('pincode') ? 'text-red-400' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        placeholder="6-digit PIN code"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={loading}
                        className={getInputStyleClass('pincode')}
                      />
                    </div>
                    {getFieldError('pincode') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('pincode')}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 sm:gap-4 text-left">
                <h4 className="text-[13px] sm:text-[14px] font-bold text-slate-700 flex items-center gap-2 mt-1">
                  <Briefcase size={16} className="text-blue-500" />
                  <span>Staff Designation & Work Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Department *</label>
                    <div className="relative flex items-center">
                      <Briefcase size={15} className={`absolute left-3.5 pointer-events-none z-10 ${getFieldError('department') ? 'text-red-400' : 'text-slate-400'}`} />
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        disabled={loading}
                        className={`w-full h-11 pl-9 sm:pl-10 pr-8 rounded-[12px] border outline-none text-[13px] sm:text-[14px] font-medium appearance-none cursor-pointer transition-all ${
                          getFieldError('department')
                            ? 'border-red-500 bg-red-50/40 text-red-900 ring-2 ring-red-100'
                            : 'border-slate-200 bg-white/90 text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50'
                        }`}
                      >
                        <option value="Warden">Warden Office</option>
                        <option value="Mess">Mess Committee</option>
                        <option value="Security">Security Guard</option>
                        <option value="Cleaning">Cleaning & Utility</option>
                        <option value="Maintenance">Maintenance Crew</option>
                      </select>
                      <div className="absolute right-3.5 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-slate-400 w-0 h-0" />
                    </div>
                    {getFieldError('department') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('department')}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Designation *</label>
                    <div className="relative flex items-center">
                      <Briefcase size={15} className={`absolute left-3.5 pointer-events-none ${getFieldError('designation') ? 'text-red-400' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        placeholder="e.g. Night Warden / Supervisor"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        disabled={loading}
                        className={getInputStyleClass('designation')}
                      />
                    </div>
                    {getFieldError('designation') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('designation')}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Mobile Number *</label>
                    <div className="relative flex items-center">
                      <Phone size={15} className={`absolute left-3.5 pointer-events-none ${getFieldError('staffPhone') ? 'text-red-400' : 'text-slate-400'}`} />
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={staffPhone}
                        onChange={(e) => setStaffPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        disabled={loading}
                        className={getInputStyleClass('staffPhone')}
                      />
                    </div>
                    {getFieldError('staffPhone') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('staffPhone')}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 sm:h-12 text-white rounded-[14px] font-bold flex items-center justify-center gap-2 transition-all text-[14px] cursor-pointer mt-3"
              style={{
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(37,99,235,0.3)',
              }}
            >
              {loading ? (
                <span>Submitting Registration...</span>
              ) : (
                <>
                  <span>Submit Registration Request</span>
                  <UserPlus size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick links */}
          <div className="flex items-center justify-center gap-1.5 mt-5 sm:mt-6 text-[12px] sm:text-[13px] font-medium text-slate-500">
            <span>Already registered?</span>
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold underline">
              Sign In Here
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] sm:text-[12px] text-slate-400 font-medium mt-4 sm:mt-6">
          Hari Pushp PG &mdash; Official Student Admission Portal
        </p>
      </div>

      {/* Image Crop & Adjust Modal */}
      {showCropModal && rawImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-[420px] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col items-center gap-4 relative">
            <div className="flex items-center justify-between w-full border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-[16px]">
                <Crop size={18} className="text-indigo-600" />
                <span>Adjust Profile Photo</span>
              </div>
              <button
                onClick={() => setShowCropModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Circular Preview Container with Touch & Drag Support */}
            <div
              className={`relative w-[240px] h-[240px] sm:w-[260px] sm:h-[260px] rounded-full overflow-hidden border-4 border-indigo-500 shadow-lg bg-slate-100 flex items-center justify-center select-none touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                handlePointerDown(touch.clientX, touch.clientY);
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                handlePointerMove(touch.clientX, touch.clientY);
              }}
              onTouchEnd={handlePointerUp}
              onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
              onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
            >
              <canvas ref={canvasRef} className="w-full h-full object-cover pointer-events-none" />
              <div className="absolute bottom-3 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-semibold px-3 py-1 rounded-full pointer-events-none flex items-center gap-1 shadow-sm">
                <span>Drag photo to align</span>
              </div>
            </div>



            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-3 w-full pt-1">
              <button
                type="button"
                onClick={() => setShowCropModal(false)}
                className="w-full h-11 rounded-2xl font-bold text-[13px] bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyCroppedImage}
                className="w-full h-11 rounded-2xl font-bold text-[13px] bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Check size={16} />
                <span>Save Crop</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;

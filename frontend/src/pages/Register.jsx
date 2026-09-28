import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth as authApi } from '../utils/api';
import {
  UserPlus, Key, Mail, ShieldAlert, Home, User, CheckCircle2, Phone,
  Briefcase, GraduationCap, Calendar, Heart, MapPin, Map, Camera,
  Crop, Check, X, Eye, EyeOff, ShieldCheck, Sparkles, Building2,
  Users, AlertCircle
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

  // Dragging state for touch/mouse gestures
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialOffsetX: 0, initialOffsetY: 0 });
  const canvasRef = useRef(null);

  // Student specific details
  const [studentPhone, setStudentPhone] = useState('');
  const [parentContact, setParentContact] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherContact, setMotherContact] = useState('');
  const [siblingContact, setSiblingContact] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
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
      case 'profilePic':
        return !profilePic ? 'Profile photo is required' : null;
      case 'name':
        return !name.trim() ? 'Full name is required' : null;
      case 'email':
        if (!email.trim()) return 'Email address is required';
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
        return role === 'STUDENT' && !coachingCollege.trim() ? 'Company or college name is required' : null;
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

  const getInputClass = (field, hasRightIcon = false) => {
    const hasErr = !!getFieldError(field);
    const rightPad = hasRightIcon ? 'pr-11' : 'pr-3.5';
    return `w-full h-11 pl-10 ${rightPad} rounded-xl border outline-none text-[14px] font-medium transition-all ${
      hasErr
        ? 'border-red-400 bg-red-50/50 text-red-900 ring-2 ring-red-100 placeholder-red-400'
        : 'border-[var(--border-color)] bg-white text-[var(--text-primary)] focus:border-brand-500 focus:ring-3 focus:ring-brand-100/60 placeholder:text-[var(--text-tertiary)]'
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

  // Pointer/Touch drag handlers for cropping
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

    // Validate photo first
    if (!profilePic) {
      setError('Profile photograph is mandatory. Please upload and adjust your photo.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate general fields
    const nameErr = getFieldError('name');
    const emailErr = getFieldError('email');
    const pwdErr = getFieldError('password');
    const confirmErr = getFieldError('confirmPassword');

    if (nameErr || emailErr || pwdErr || confirmErr) {
      setError('Please fix the highlighted fields in red before submitting.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      payload.phoneNumber = studentPhone;
      payload.parentContact = parentContact;
      payload.motherName = motherName;
      payload.motherContact = motherContact;
      payload.siblingContact = siblingContact;
      payload.emergencyContact = emergencyContact;
      payload.bloodGroup = bloodGroup;
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-primary)] px-4 py-12">
        <div className="glass-card w-full max-w-[500px] p-8 sm:p-10 rounded-[24px] text-center flex flex-col items-center gap-5 shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-mint-100 text-brand-700 flex items-center justify-center">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold bg-mint-100 text-brand-800 mb-2">
              <Sparkles size={13} />
              Registration Submitted
            </span>
            <h2 className="text-[22px] sm:text-[24px] font-bold text-[var(--text-primary)]">Application Under Review</h2>
            <p className="text-[14px] text-[var(--text-secondary)] font-medium mt-2 leading-relaxed">
              Hi, <span className="font-bold text-[var(--text-primary)]">{name}</span>. Your registration details and photograph have been received successfully.
            </p>
            <p className="text-[13px] text-[var(--text-tertiary)] font-medium mt-1 leading-relaxed">
              The hostel warden office will review and verify your account. You will be able to log in once approved.
            </p>
          </div>

          <div className="w-full h-px bg-[var(--border-color)] my-1" />

          <Link
            to="/login"
            className="w-full h-12 bg-sun-300 hover:bg-sun-400 text-sun-900 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-[14px] shadow-xs"
          >
            <span>Proceed to Login</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg-primary)] flex flex-col items-center justify-start py-8 sm:py-12 px-4 sm:px-6">
      <div className="w-full max-w-[720px] mx-auto flex flex-col items-center">
        {/* Portal Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-xs">
              <Building2 size={20} />
            </div>
            <span className="text-[18px] sm:text-[20px] font-bold text-[var(--text-primary)] tracking-tight">
              Hari Pushp PG Hostel
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold bg-mint-100 text-brand-800 border border-mint-200">
            <ShieldCheck size={14} />
            Official Student & Staff Registration Portal
          </span>
        </div>

        {/* Main Card */}
        <div className="glass-card w-full bg-white border border-[var(--border-color)] rounded-[24px] p-6 sm:p-10 shadow-sm flex flex-col">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--border-color)] pb-5 mb-6">
            <div>
              <h1 className="text-[20px] sm:text-[22px] font-bold text-[var(--text-primary)] tracking-tight">
                Hostel Admission Form
              </h1>
              <p className="text-[13px] text-[var(--text-secondary)] font-medium mt-0.5">
                Complete your details below to request hostel registration
              </p>
            </div>
            <div className="text-[12px] font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-lg self-start sm:self-auto border border-brand-100">
              * All fields marked * are required
            </div>
          </div>

          {/* Global Error Banner */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[13px] font-semibold mb-6">
              <AlertCircle size={18} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Switcher */}
          <div className="flex flex-col gap-1.5 mb-6">
            <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Register As <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setRole('STUDENT')}
                className={`py-2.5 rounded-lg font-bold text-[13px] border-none cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  role === 'STUDENT'
                    ? 'bg-white text-brand-800 shadow-xs border border-mint-200'
                    : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <GraduationCap size={17} />
                <span>Student Resident</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('STAFF')}
                className={`py-2.5 rounded-lg font-bold text-[13px] border-none cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  role === 'STAFF'
                    ? 'bg-white text-brand-800 shadow-xs border border-mint-200'
                    : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Briefcase size={17} />
                <span>Staff Member</span>
              </button>
            </div>
          </div>

          {/* Profile Photo Uploader (Mandatory) */}
          <div
            className={`flex flex-col items-center justify-center p-5 rounded-2xl mb-6 transition-all text-center ${
              submitted && !profilePic
                ? 'bg-red-50/70 border-2 border-red-400 ring-4 ring-red-100'
                : 'bg-mint-50/60 border border-mint-200/80'
            }`}
          >
            <div className="relative group cursor-pointer mb-2">
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="Profile Preview"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center border-4 border-white shadow-md ${
                    submitted && !profilePic
                      ? 'bg-red-100 text-red-500'
                      : 'bg-mint-100 text-brand-600'
                  }`}
                >
                  <User size={40} />
                </div>
              )}
              <label
                htmlFor="profile-pic-input"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md cursor-pointer hover:bg-brand-700 transition-colors"
                title="Upload Photo"
              >
                <Camera size={15} />
              </label>
              <input
                id="profile-pic-input"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              <label
                htmlFor="profile-pic-input"
                className="text-[13px] font-bold text-brand-700 hover:text-brand-800 cursor-pointer underline"
              >
                {profilePic ? 'Change Photo' : 'Upload Passport Photo * (Mandatory)'}
              </label>
              {profilePic && (
                <button
                  type="button"
                  onClick={() => setShowCropModal(true)}
                  className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-white px-3 py-1 rounded-full border border-[var(--border-color)] flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Crop size={12} />
                  <span>Adjust / Crop</span>
                </button>
              )}
            </div>

            {submitted && !profilePic ? (
              <span className="text-[12px] text-red-600 font-bold mt-2 flex items-center gap-1">
                <AlertCircle size={14} />
                Passport photograph is mandatory for hostel ID card & student records
              </span>
            ) : (
              <span className="text-[11px] text-[var(--text-tertiary)] font-medium mt-1">
                JPG or PNG format &bull; Passport style &bull; Max 8MB
              </span>
            )}
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
            {/* 1. Account Credentials */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[13px] font-bold text-brand-800 bg-mint-50 px-3 py-1.5 rounded-lg border border-mint-100">
                <ShieldCheck size={16} className="text-brand-600" />
                <span>1. Login Credentials & Basic Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <User size={16} className={`absolute left-3.5 pointer-events-none ${getFieldError('name') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                    <input
                      type="text"
                      placeholder="e.g. Priya Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      className={getInputClass('name')}
                    />
                  </div>
                  {getFieldError('name') && (
                    <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('name')}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Mail size={16} className={`absolute left-3.5 pointer-events-none ${getFieldError('email') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                    <input
                      type="email"
                      placeholder="priya@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className={getInputClass('email')}
                    />
                  </div>
                  {getFieldError('email') && (
                    <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('email')}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Key size={16} className={`absolute left-3.5 pointer-events-none ${getFieldError('password') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className={getInputClass('password', true)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus:outline-none p-1 rounded-full cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {getFieldError('password') && (
                    <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('password')}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Key size={16} className={`absolute left-3.5 pointer-events-none ${getFieldError('confirmPassword') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className={getInputClass('confirmPassword', true)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus:outline-none p-1 rounded-full cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {getFieldError('confirmPassword') && (
                    <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('confirmPassword')}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Role Specific Information */}
            {role === 'STUDENT' ? (
              <>
                {/* Contact & Personal */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-brand-800 bg-mint-50 px-3 py-1.5 rounded-lg border border-mint-100">
                    <Users size={16} className="text-brand-600" />
                    <span>2. Student Contact & Personal Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Student Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Phone size={16} className={`absolute left-3.5 pointer-events-none ${getFieldError('studentPhone') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                        <input
                          type="tel"
                          placeholder="10-digit mobile number"
                          value={studentPhone}
                          onChange={(e) => setStudentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          disabled={loading}
                          className={getInputClass('studentPhone')}
                        />
                      </div>
                      {getFieldError('studentPhone') && (
                        <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('studentPhone')}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Parent / Guardian Contact <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Phone size={16} className={`absolute left-3.5 pointer-events-none ${getFieldError('parentContact') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                        <input
                          type="tel"
                          placeholder="Parent 10-digit mobile"
                          value={parentContact}
                          onChange={(e) => setParentContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          disabled={loading}
                          className={getInputClass('parentContact')}
                        />
                      </div>
                      {getFieldError('parentContact') && (
                        <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('parentContact')}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Date of Joining <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Calendar size={16} className={`absolute left-3.5 pointer-events-none z-10 ${getFieldError('dateOfJoining') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                        <input
                          type="date"
                          value={dateOfJoining}
                          onChange={(e) => setDateOfJoining(e.target.value)}
                          disabled={loading}
                          className={getInputClass('dateOfJoining')}
                        />
                      </div>
                      {getFieldError('dateOfJoining') && (
                        <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('dateOfJoining')}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Calendar size={16} className={`absolute left-3.5 pointer-events-none z-10 ${getFieldError('dob') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          disabled={loading}
                          className={getInputClass('dob')}
                        />
                      </div>
                      {getFieldError('dob') && (
                        <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('dob')}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Father's Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <User size={16} className={`absolute left-3.5 pointer-events-none ${getFieldError('fatherName') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                        <input
                          type="text"
                          placeholder="Father's full name"
                          value={fatherName}
                          onChange={(e) => setFatherName(e.target.value)}
                          disabled={loading}
                          className={getInputClass('fatherName')}
                        />
                      </div>
                      {getFieldError('fatherName') && (
                        <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('fatherName')}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Mother's Name
                      </label>
                      <div className="relative flex items-center">
                        <User size={16} className="absolute left-3.5 pointer-events-none text-[var(--text-tertiary)]" />
                        <input
                          type="text"
                          placeholder="Mother's full name"
                          value={motherName}
                          onChange={(e) => setMotherName(e.target.value)}
                          disabled={loading}
                          className={getInputClass('motherName')}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Mother's Mobile Number
                      </label>
                      <div className="relative flex items-center">
                        <Phone size={16} className="absolute left-3.5 pointer-events-none text-[var(--text-tertiary)]" />
                        <input
                          type="tel"
                          placeholder="Mother's 10-digit mobile"
                          value={motherContact}
                          onChange={(e) => setMotherContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          disabled={loading}
                          className={getInputClass('motherContact')}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Sibling Mobile Number
                      </label>
                      <div className="relative flex items-center">
                        <Phone size={16} className="absolute left-3.5 pointer-events-none text-[var(--text-tertiary)]" />
                        <input
                          type="tel"
                          placeholder="Brother / Sister 10-digit mobile"
                          value={siblingContact}
                          onChange={(e) => setSiblingContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          disabled={loading}
                          className={getInputClass('siblingContact')}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Emergency Contact Details
                      </label>
                      <div className="relative flex items-center">
                        <Phone size={16} className="absolute left-3.5 pointer-events-none text-[var(--text-tertiary)]" />
                        <input
                          type="text"
                          placeholder="Emergency contact person & phone"
                          value={emergencyContact}
                          onChange={(e) => setEmergencyContact(e.target.value)}
                          disabled={loading}
                          className={getInputClass('emergencyContact')}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Blood Group
                      </label>
                      <div className="relative flex items-center">
                        <Heart size={16} className="absolute left-3.5 pointer-events-none text-[var(--text-tertiary)] z-10" />
                        <select
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value)}
                          disabled={loading}
                          className="w-full h-11 pl-10 pr-8 rounded-xl border border-[var(--border-color)] bg-white outline-none text-[14px] font-medium text-[var(--text-primary)] focus:border-brand-500 focus:ring-3 focus:ring-brand-100/60 appearance-none cursor-pointer transition-all"
                        >
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                        <div className="absolute right-3.5 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-[var(--text-tertiary)] w-0 h-0" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Marital Status <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Heart size={16} className={`absolute left-3.5 pointer-events-none z-10 ${getFieldError('maritalStatus') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                        <select
                          value={maritalStatus}
                          onChange={(e) => setMaritalStatus(e.target.value)}
                          disabled={loading}
                          className={`w-full h-11 pl-10 pr-8 rounded-xl border outline-none text-[14px] font-medium appearance-none cursor-pointer transition-all ${
                            getFieldError('maritalStatus')
                              ? 'border-red-400 bg-red-50/50 text-red-900 ring-2 ring-red-100'
                              : 'border-[var(--border-color)] bg-white text-[var(--text-primary)] focus:border-brand-500 focus:ring-3 focus:ring-brand-100/60'
                          }`}
                        >
                          <option value="Unmarried">Unmarried</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                        </select>
                        <div className="absolute right-3.5 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-[var(--text-tertiary)] w-0 h-0" />
                      </div>
                      {getFieldError('maritalStatus') && (
                        <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('maritalStatus')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Academic & Permanent Address */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-brand-800 bg-mint-50 px-3 py-1.5 rounded-lg border border-mint-100">
                    <GraduationCap size={16} className="text-brand-600" />
                    <span>3. College, Coaching & Address Information</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        College / Coaching / Company Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <GraduationCap size={16} className={`absolute left-3.5 pointer-events-none ${getFieldError('coachingCollege') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                        <input
                          type="text"
                          placeholder="e.g. Allen Career Institute / University of Rajasthan / Tech Mahindra"
                          value={coachingCollege}
                          onChange={(e) => setCoachingCollege(e.target.value)}
                          disabled={loading}
                          className={getInputClass('coachingCollege')}
                        />
                      </div>
                      {getFieldError('coachingCollege') && (
                        <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('coachingCollege')}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Permanent Residential Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <MapPin size={16} className={`absolute left-3.5 pointer-events-none ${getFieldError('permanentAddress') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                        <input
                          type="text"
                          placeholder="House No., Street, Colony, Village/City"
                          value={permanentAddress}
                          onChange={(e) => setPermanentAddress(e.target.value)}
                          disabled={loading}
                          className={getInputClass('permanentAddress')}
                        />
                      </div>
                      {getFieldError('permanentAddress') && (
                        <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('permanentAddress')}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        State / Union Territory <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Map size={16} className={`absolute left-3.5 pointer-events-none z-10 ${getFieldError('state') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                        <select
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          disabled={loading}
                          className={`w-full h-11 pl-10 pr-8 rounded-xl border outline-none text-[14px] font-medium appearance-none cursor-pointer transition-all ${
                            getFieldError('state')
                              ? 'border-red-400 bg-red-50/50 text-red-900 ring-2 ring-red-100'
                              : 'border-[var(--border-color)] bg-white text-[var(--text-primary)] focus:border-brand-500 focus:ring-3 focus:ring-brand-100/60'
                          }`}
                        >
                          {INDIAN_STATES_AND_UTS.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                        <div className="absolute right-3.5 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-[var(--text-tertiary)] w-0 h-0" />
                      </div>
                      {getFieldError('state') && (
                        <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('state')}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        PIN Code <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <MapPin size={16} className={`absolute left-3.5 pointer-events-none ${getFieldError('pincode') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                        <input
                          type="text"
                          placeholder="6-digit PIN code"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          disabled={loading}
                          className={getInputClass('pincode')}
                        />
                      </div>
                      {getFieldError('pincode') && (
                        <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('pincode')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Staff Information Section */
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[13px] font-bold text-brand-800 bg-mint-50 px-3 py-1.5 rounded-lg border border-mint-100">
                  <Briefcase size={16} className="text-brand-600" />
                  <span>2. Staff Designation & Department Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Briefcase size={16} className={`absolute left-3.5 pointer-events-none z-10 ${getFieldError('department') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        disabled={loading}
                        className={`w-full h-11 pl-10 pr-8 rounded-xl border outline-none text-[14px] font-medium appearance-none cursor-pointer transition-all ${
                          getFieldError('department')
                            ? 'border-red-400 bg-red-50/50 text-red-900 ring-2 ring-red-100'
                            : 'border-[var(--border-color)] bg-white text-[var(--text-primary)] focus:border-brand-500 focus:ring-3 focus:ring-brand-100/60'
                        }`}
                      >
                        <option value="Warden">Warden Office</option>
                        <option value="Mess">Mess Committee</option>
                        <option value="Security">Security Guard</option>
                        <option value="Cleaning">Cleaning & Utility</option>
                        <option value="Maintenance">Maintenance Crew</option>
                      </select>
                      <div className="absolute right-3.5 pointer-events-none border-l border-r-0 border-t-[5px] border-b-0 border-transparent border-t-[var(--text-tertiary)] w-0 h-0" />
                    </div>
                    {getFieldError('department') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('department')}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Designation / Role Title <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Briefcase size={16} className={`absolute left-3.5 pointer-events-none ${getFieldError('designation') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                      <input
                        type="text"
                        placeholder="e.g. Night Supervisor / Warden"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        disabled={loading}
                        className={getInputClass('designation')}
                      />
                    </div>
                    {getFieldError('designation') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('designation')}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Staff Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Phone size={16} className={`absolute left-3.5 pointer-events-none ${getFieldError('staffPhone') ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={staffPhone}
                        onChange={(e) => setStaffPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        disabled={loading}
                        className={getInputClass('staffPhone')}
                      />
                    </div>
                    {getFieldError('staffPhone') && (
                      <span className="text-[11px] font-semibold text-red-500 mt-0.5">{getFieldError('staffPhone')}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-sun-300 hover:bg-sun-400 text-sun-900 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-[15px] cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span>Submitting Admission Request...</span>
                ) : (
                  <>
                    <span>Submit Admission Registration</span>
                    <UserPlus size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer link to login */}
          <div className="flex items-center justify-center gap-2 mt-6 pt-5 border-t border-[var(--border-color)] text-[13px] font-medium text-[var(--text-secondary)]">
            <span>Already have an account?</span>
            <Link to="/login" className="text-brand-700 hover:text-brand-800 font-bold underline">
              Sign In Here
            </Link>
          </div>
        </div>

        {/* Portal footer */}
        <p className="text-center text-[12px] text-[var(--text-tertiary)] font-medium mt-6">
          Hari Pushp PG Girls Hostel &bull; Secure Admission Portal
        </p>
      </div>

      {/* Image Crop Modal */}
      {showCropModal && rawImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1b2a29]/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-[420px] rounded-[22px] p-6 shadow-2xl flex flex-col items-center gap-4 relative border border-[var(--border-color)]">
            <div className="flex items-center justify-between w-full border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-[16px]">
                <Crop size={18} className="text-brand-600" />
                <span>Adjust & Align Photo</span>
              </div>
              <button
                onClick={() => setShowCropModal(false)}
                className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Circular Preview Container with Touch & Drag */}
            <div
              className={`relative w-[240px] h-[240px] rounded-full overflow-hidden border-4 border-brand-500 shadow-md bg-[var(--bg-tertiary)] flex items-center justify-center select-none touch-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
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
              <div className="absolute bottom-3 bg-[#1b2a29]/75 text-white text-[10px] font-semibold px-3 py-1 rounded-full pointer-events-none flex items-center gap-1 shadow-sm">
                <span>Drag photo to center</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => setShowCropModal(false)}
                className="w-full h-11 rounded-xl font-bold text-[13px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyCroppedImage}
                className="w-full h-11 rounded-xl font-bold text-[13px] bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Check size={16} />
                <span>Save Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;

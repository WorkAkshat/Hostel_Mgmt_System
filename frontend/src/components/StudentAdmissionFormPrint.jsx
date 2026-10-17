import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Download, ShieldCheck, GraduationCap, Phone, MapPin, User, Heart, Calendar, Building2 } from 'lucide-react';

const StudentAdmissionFormPrint = ({ student, onClose }) => {
  const printRef = useRef(null);

  // Prevent background body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!student) return null;

  const handlePrint = () => {
    window.print();
  };

  const studentName = student.user?.name || student.name || 'N/A';
  const studentEmail = student.user?.email || student.email || 'N/A';
  const rollNo = student.rollNumber || student.user?.studentDetails?.rollNumber || 'Assigned on approval';

  const ROOM_PRICING = {
    1: { label: 'Single Sharing', roomFee: 13000, messFee: 3000, total: 16000 },
    2: { label: 'Twin Sharing', roomFee: 11000, messFee: 3000, total: 14000 },
    3: { label: 'Triple Sharing', roomFee: 9000, messFee: 3000, total: 12000 },
  };

  const roomSharingType = student.room?.sharingType || 2;
  const feeDetails = ROOM_PRICING[roomSharingType] || ROOM_PRICING[2];
  const joiningDate = student.dateOfJoining ? new Date(student.dateOfJoining).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const dobDate = student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : 'N/A';

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-[#1b2a29]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      {/* Modal Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] my-auto flex flex-col overflow-hidden animate-fade-in text-slate-800 text-left border border-slate-200 relative z-[100000]" onClick={(e) => e.stopPropagation()}>
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-[#1b2a29] text-white flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-sun-300" size={20} />
            <h3 className="font-bold text-sm sm:text-base tracking-wide !text-white m-0">Official Student Admission & Undertaking Form</h3>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Printer size={15} />
              <span>Print Form</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PRINTABLE ADMISSION FORM CONTAINER */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 bg-white text-slate-900 print:p-0 print:space-y-4 print:overflow-visible" ref={printRef} id="printable-admission-form">
          
          {/* Form Header */}
          <div className="border-b-2 border-brand-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-brand-900 tracking-tight uppercase">HARI PUSHP PG GIRLS HOSTEL</h1>
              <p className="text-xs font-bold text-slate-600 tracking-wider uppercase mt-0.5">& EXECUTIVE RESIDENCES FOR WOMEN</p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">123 University Campus Road, Education Hub, Pin: 302004</p>
              <p className="text-[11px] text-slate-500 font-medium">Contact: +91 98100 33331 | Email: admin@haripushppg.com</p>
            </div>
            
            <div className="text-right flex flex-col items-end shrink-0">
              <span className="bg-mint-100 border border-mint-300 text-brand-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Official Admission Record
              </span>
              <span className="text-xs font-mono font-extrabold text-slate-700 mt-2">
                Roll No: <strong className="text-brand-800 font-black">{rollNo}</strong>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Date: {joiningDate}</span>
            </div>
          </div>

          {/* Title Line */}
          <div className="bg-mint-50 border border-mint-200 py-1.5 px-4 text-center rounded-lg">
            <h2 className="text-xs sm:text-sm font-black tracking-widest text-brand-900 uppercase m-0">
              STUDENT ENROLLMENT & UNDERTAKING FORM (छात्र प्रवेश आवेदन पत्र)
            </h2>
          </div>

          {/* Top Info Grid with Photo Box */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            
            {/* Main Student Details Table (3 Columns) */}
            <div className="md:col-span-3 space-y-4">
              <h3 className="text-xs font-bold text-brand-800 uppercase tracking-wider border-b border-slate-200 pb-1 m-0">
                SECTION A: STUDENT PERSONAL DETAILS (विद्यार्थी विवरण)
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{studentName}</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Mobile</span>
                  <span className="font-extrabold text-slate-900 text-sm">{student.phoneNumber || 'N/A'}</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                  <span className="font-bold text-slate-800 text-xs">{studentEmail}</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date of Birth / Blood Group</span>
                  <span className="font-bold text-slate-800 text-xs">{dobDate} | Blood: {student.bloodGroup || 'O+'}</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company / College</span>
                  <span className="font-bold text-slate-800 text-xs">{student.coachingCollege || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Passport Photo Frame (1 Column) */}
            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl min-h-[160px] text-center shrink-0">
              {student.profilePic || student.user?.avatar ? (
                <img
                  src={student.profilePic || student.user?.avatar}
                  alt={studentName}
                  className="w-28 h-32 object-cover rounded-lg shadow-sm border border-slate-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 text-slate-400 py-4">
                  <User size={32} />
                  <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Student Photograph</span>
                  <span className="text-[9px] text-slate-400">Passport Size</span>
                </div>
              )}
            </div>

          </div>

          {/* Section B: Family & Emergency Contact Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-brand-800 uppercase tracking-wider border-b border-slate-200 pb-1 m-0">
              SECTION B: PARENT & FAMILY CONTACT DETAILS (अभिभावक व परिजन विवरण)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Father's Name</span>
                <span className="font-bold text-slate-800">{student.fatherName || 'N/A'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Father's Mobile Number</span>
                <span className="font-extrabold text-brand-800">{student.parentContact || 'N/A'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mother's Name</span>
                <span className="font-bold text-slate-800">{student.motherName || 'N/A'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mother's Mobile Number</span>
                <span className="font-extrabold text-brand-800">{student.motherContact || 'N/A'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Brother / Sister Mobile</span>
                <span className="font-extrabold text-brand-800">{student.siblingContact || 'N/A'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emergency Contact</span>
                <span className="font-extrabold text-emerald-700">{student.emergencyContact || student.parentContact || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Section C: Permanent Address & Room Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-brand-800 uppercase tracking-wider border-b border-slate-200 pb-1 m-0">
              SECTION C: RESIDENTIAL & HOSTEL ALLOCATION DETAILS (आवास व कमरा विवरण)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 sm:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Permanent Address</span>
                <span className="font-semibold text-slate-800">{student.permanentAddress || 'N/A'}, {student.state || 'Rajasthan'} - {student.pincode || 'N/A'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Room & Monthly Fee</span>
                <span className="font-extrabold text-brand-800 text-xs block">
                  {student.room ? `Room ${student.room.roomNumber} (${student.room.block || 'Main Block'})` : 'Unallocated'}
                </span>
                {student.room ? (
                  <span className="text-[11px] font-bold text-emerald-700 block mt-0.5">
                    ₹{feeDetails.total.toLocaleString('en-IN')}/mo ({feeDetails.label}: Room ₹{feeDetails.roomFee.toLocaleString('en-IN')} + Mess ₹3,000)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-600 block mt-0.5">Pending Room Assignment</span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION D: OFFICIAL HOSTEL RULES & UNDERTAKING (नियम) */}
          <div className="space-y-3 border-t-2 border-brand-800 pt-4">
            <div className="flex justify-between items-center border-b border-slate-300 pb-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider m-0">
                नियम (Rules & Regulations)
              </h3>
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Mandatory Compliance</span>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-300 space-y-3 text-[11px] text-slate-800 leading-relaxed">
              <div>
                <p className="font-bold text-slate-900 m-0">
                  1. हॉस्टल का समय प्रातः 6:00 बजे से रात्रि 10:00 बजे तक है। इसके बाद बाहर आना जाना सख्त मना है।
                </p>
                <p className="text-slate-600 text-[10.5px] italic m-0">
                  (Hostel timings are from 6:00 AM to 10:00 PM. Entry or exit after this is strictly prohibited.)
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-900 m-0">
                  2. हॉस्टल की फीस लेने के संदर्भ में महीना प्रत्येक माह की 10 तारीख से अगले माह की 9 तारीख तक रहेगा। हॉस्टल की फीस प्रत्येक माह की 10 तारीख को जमा करवा देवें, अन्यथा प्रतिदिन 100/- रूपये पैनल्टी ली जायेगी। हॉस्टल का किराया अग्रिम देय होगा।
                </p>
                <p className="text-slate-600 text-[10.5px] italic m-0">
                  (Month will start on 10th of every month to 9th of next month. Hostel Fees must be paid on 10th of every month, Otherwise a daily penalty of ₹100 will be charged. Rent is payable in advance.)
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-900 m-0">
                  3. हॉस्टल परिसर में मदिरा, मांसाहार, धूम्रपान, अनैतिक व संदिग्ध गतिविधि में लिप्त पाए जाने पर व व्यवहार सही न होने पर तुरन्त हॉस्टल खाली करवा लिया जायेगा व जमा राशि वापिस नहीं दी जायेगी।
                </p>
                <p className="text-slate-600 text-[10.5px] italic m-0">
                  (In Hostel campus, consumption of alcohol, non-veg, smoking, immoral or suspicious activities, or misbehaviour will result in immediate eviction with no deposit refund.)
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-900 m-0">
                  4. सम्पत्ति की तोड़-फोड़ या किसी प्रकार की छेड़खानी करने पर हर्जाना खर्चा विद्यार्थी / हॉस्टलर को देना होगा।
                </p>
                <p className="text-slate-600 text-[10.5px] italic m-0">
                  (The student will be responsible for the cost of any damages or tampering with hostel property.)
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-900 m-0">
                  5. कीमती सामान लैपटॉप, मोबाइल व पैसों की सुरक्षा स्वयं को करनी होगी, व्यवस्थापक की कोई जिम्मेदारी नहीं होगी।
                </p>
                <p className="text-slate-600 text-[10.5px] italic m-0">
                  (Safety of valuables like laptops, mobile phones, and cash is the student's responsibility; the management is not liable for any loss.)
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-900 m-0">
                  6. अगर कोई भी विद्यार्थी डिप्रेशन में या अन्य किसी कारण से किसी तरह की कोई शारीरिक नुकसान करता है तो व्यवस्थापक की कोई जिम्मेदारी नहीं होगी। इसका जिम्मेदार वह स्वयं होगा।
                </p>
                <p className="text-slate-600 text-[10.5px] italic m-0">
                  (The management is not responsible if a student causes physical harm to themselves; the student will be solely responsible.)
                </p>
              </div>
            </div>
          </div>

          {/* Declaration Statement */}
          <p className="text-[10.5px] text-slate-700 font-medium leading-relaxed border-l-4 border-brand-600 pl-3 py-1 m-0">
            <strong>Undertaking:</strong> I hereby declare that all information provided above is true and correct to the best of my knowledge. I have read and agree to strictly abide by all rules & regulations of Hari Pushp Tower Girls Hostel.
          </p>

          {/* SECTION E: SIGNATURES & VERIFICATION */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="border-t border-slate-900 pt-2">
              <span className="font-bold text-slate-900 block">विद्यार्थी के हस्ताक्षर</span>
              <span className="text-[10px] text-slate-500 font-medium">(Signature of Student)</span>
            </div>

            <div className="border-t border-slate-900 pt-2">
              <span className="font-bold text-slate-900 block">अभिभावक के हस्ताक्षर</span>
              <span className="text-[10px] text-slate-500 font-medium">(Signature of Parent / Guardian)</span>
            </div>

            <div className="border-t border-slate-900 pt-2">
              <span className="font-bold text-slate-900 block">वार्डन / व्यवस्थापक के हस्ताक्षर</span>
              <span className="text-[10px] text-slate-500 font-medium">(Signature of Chief Warden)</span>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="border-t border-slate-200 pt-3 flex justify-between text-[10px] text-slate-400 font-medium">
            <span>Form Generated via Hari Pushp Tower Management Portal</span>
            <span>Date & Place: {joiningDate}, Jaipur</span>
          </div>

        </div>
      </div>

      {/* Global CSS for Clean A4 Printing */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          body * {
            visibility: hidden !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          #printable-admission-form, #printable-admission-form * {
            visibility: visible !important;
          }
          #printable-admission-form {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 10px !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default StudentAdmissionFormPrint;

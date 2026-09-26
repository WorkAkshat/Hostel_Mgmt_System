import { useRef } from 'react';
import { Printer, X, Download, ShieldCheck, GraduationCap, Phone, MapPin, User, Heart, Calendar } from 'lucide-react';

const StudentAdmissionFormPrint = ({ student, onClose }) => {
  const printRef = useRef(null);

  if (!student) return null;

  const handlePrint = () => {
    window.print();
  };

  const studentName = student.user?.name || 'N/A';
  const studentEmail = student.user?.email || 'N/A';
  const rollNo = student.rollNumber || 'HARIPUSHP_001';
  const roomNo = student.room ? `Room ${student.room.roomNumber} (${student.room.block || 'Main Block'})` : 'Unallocated';
  const bedNo = student.bedId || 'Bed A';
  const joiningDate = student.dateOfJoining ? new Date(student.dateOfJoining).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const dobDate = student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : 'N/A';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in text-slate-800 text-left border border-slate-200">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-blue-400" size={20} />
            <h3 className="font-bold text-sm sm:text-base tracking-wide">Official Hostel Admission Form</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Printer size={15} />
              <span>Print Form</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PRINTABLE ADMISSION FORM CONTAINER */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 bg-white text-slate-900 print:p-0 print:space-y-4 print:overflow-visible" ref={printRef} id="printable-admission-form">
          
          {/* Form Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-blue-900 tracking-tight uppercase">HARI PUSHP PG GIRLS HOSTEL</h1>
              <p className="text-xs font-bold text-slate-600 tracking-wider uppercase mt-0.5">& EXECUTIVE RESIDENCES FOR WOMEN</p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">123 University Campus Road, Education Hub, Pin: 302004</p>
              <p className="text-[11px] text-slate-500 font-medium">Contact: +91 98100 33331 | Email: admin@haripushppg.com</p>
            </div>
            
            <div className="text-right flex flex-col items-end shrink-0">
              <span className="bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Official Admission Record
              </span>
              <span className="text-xs font-mono font-extrabold text-slate-700 mt-2">
                Roll No: <strong className="text-blue-700 font-black">{rollNo}</strong>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Date: {joiningDate}</span>
            </div>
          </div>

          {/* Title Line */}
          <div className="bg-slate-100 border border-slate-300 py-1.5 px-4 text-center rounded-lg">
            <h2 className="text-xs sm:text-sm font-black tracking-widest text-slate-900 uppercase">
              STUDENT ENROLLMENT & UNDERTAKING FORM (छात्र प्रवेश आवेदन पत्र)
            </h2>
          </div>

          {/* Top Info Grid with Photo Box */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            
            {/* Main Student Details Table (3 Columns) */}
            <div className="md:col-span-3 space-y-4">
              <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-slate-200 pb-1">
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


                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">College / Coaching Institute</span>
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
                  <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Affix Student Photograph</span>
                  <span className="text-[9px] text-slate-400">Passport Size</span>
                </div>
              )}
            </div>

          </div>

          {/* Section B: Family & Emergency Contact Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-slate-200 pb-1">
              SECTION B: PARENT & FAMILY CONTACT DETAILS (अभिभावक व परिजन विवरण)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Father's Name</span>
                <span className="font-bold text-slate-800">{student.fatherName || 'N/A'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Father's Mobile Number</span>
                <span className="font-extrabold text-blue-900">{student.parentContact || 'N/A'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mother's Name</span>
                <span className="font-bold text-slate-800">{student.motherName || 'N/A'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mother's Mobile Number</span>
                <span className="font-extrabold text-blue-900">{student.motherContact || 'N/A'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Brother / Sister Mobile Number</span>
                <span className="font-extrabold text-blue-900">{student.siblingContact || 'N/A'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emergency Contact</span>
                <span className="font-extrabold text-emerald-700">{student.emergencyContact || student.parentContact || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Section C: Permanent Address & Room Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-slate-200 pb-1">
              SECTION C: RESIDENTIAL & HOSTEL ALLOCATION DETAILS (आवास व कमरा विवरण)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 sm:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Permanent Address</span>
                <span className="font-semibold text-slate-800">{student.permanentAddress || 'N/A'}, {student.state || 'Rajasthan'} - {student.pincode || 'N/A'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Hostel Room</span>
                <span className="font-extrabold text-blue-900">{roomNo} (Bed: {bedNo})</span>
              </div>
            </div>
          </div>

          {/* SECTION D: OFFICIAL HOSTEL RULES & UNDERTAKING (नियम) */}
          <div className="space-y-3 border-t-2 border-slate-900 pt-4">
            <div className="flex justify-between items-center border-b border-slate-300 pb-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                नियम (Rules & Regulations)
              </h3>
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Mandatory Compliance</span>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-300 space-y-3 text-[11px] text-slate-800 leading-relaxed">
              
              {/* Rule 1 */}
              <div>
                <p className="font-bold text-slate-900">
                  1. हॉस्टल का समय प्रातः 6:00 बजे से रात्रि 10:00 बजे तक है। इसके बाद बाहर आना जाना सख्त मना है।
                </p>
                <p className="text-slate-600 text-[10.5px] italic">
                  (Hostel timings are from 6:00 AM to 10:00 PM. Entry or exit after this is strictly prohibited.)
                </p>
              </div>

              {/* Rule 2 */}
              <div>
                <p className="font-bold text-slate-900">
                  2. हॉस्टल की फीस लेने के संदर्भ में महीना प्रत्येक माह की 10 तारीख से अगले माह की 9 तारीख तक रहेगा। हॉस्टल की फीस प्रत्येक माह की 10 तारीख को जमा करवा देवें, अन्यथा प्रतिदिन 100/- रूपये पैनल्टी ली जायेगी। हॉस्टल का किराया अग्रिम देय होगा।
                </p>
                <p className="text-slate-600 text-[10.5px] italic">
                  (Month will start on 10th of every month to 9th of next month with reference to taking hostel fee. Hostel Fees must be paid on 10th of every month, Otherwise a daily penalty of ₹100 will be charged. Rent is payable in advance.)
                </p>
              </div>

              {/* Rule 3 */}
              <div>
                <p className="font-bold text-slate-900">
                  3. हॉस्टल परिसर में मदिरा, मांसाहार, धूम्रपान, अनैतिक व संदिग्ध गतिविधि में लिप्त पाए जाने पर व व्यवहार सही न होने पर तुरन्त हॉस्टल खाली करवा लिया जायेगा व जमा राशि वापिस नहीं दी जायेगी।
                </p>
                <p className="text-slate-600 text-[10.5px] italic">
                  (In Hostel campus, If found involved in consuming alcohol, Non-Veg, smoking, immoral or suspicious activities, or misbehaviour, the student will be evicted immediately and the deposit will not be refunded.)
                </p>
              </div>

              {/* Rule 4 */}
              <div>
                <p className="font-bold text-slate-900">
                  4. सम्पत्ति की तोड़-फोड़ या किसी प्रकार की छेड़खानी करने पर हर्जाना खर्चा विद्यार्थी / हॉस्टलर को देना होगा।
                </p>
                <p className="text-slate-600 text-[10.5px] italic">
                  (The student/ Hosteler will be responsible for the cost of damages or tampering with hostel property.)
                </p>
              </div>

              {/* Rule 5 */}
              <div>
                <p className="font-bold text-slate-900">
                  5. कीमती सामान लैपटॉप, मोबाइल व पैसों की सुरक्षा स्वयं को करनी होगी, व्यवस्थापक की कोई जिम्मेदारी नहीं होगी।
                </p>
                <p className="text-slate-600 text-[10.5px] italic">
                  (Safety of valuables like laptops, mobile phones, and cash is the student's responsibility; the management is not liable for any loss.)
                </p>
              </div>

              {/* Rule 6 */}
              <div>
                <p className="font-bold text-slate-900">
                  6. अगर कोई भी विद्यार्थी डिप्रेशन में या अन्य किसी कारण से किसी तरह की कोई शारीरिक नुकसान करता है तो व्यवस्थापक की कोई जिम्मेदारी नहीं होगी। इसका जिम्मेदार वह स्वयं होगा।
                </p>
                <p className="text-slate-600 text-[10.5px] italic">
                  (The management will not be responsible if a student/ Hosteler causes physical harm to themselves due to depression or any other reason; the student will be solely responsible.)
                </p>
              </div>

            </div>
          </div>

          {/* Declaration Statement */}
          <p className="text-[10.5px] text-slate-700 font-medium leading-relaxed border-l-4 border-blue-600 pl-3 py-1">
            <strong>Undertaking:</strong> I hereby declare that all information provided above is true and correct to the best of my knowledge. I have read and agree to strictly abide by all rules & regulations of Hari Pushp PG Girls Hostel.
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
            <span>Form Generated via Hari Pushp PG Management Portal</span>
            <span>Date & Place: {joiningDate}, Jaipur</span>
          </div>

        </div>
      </div>

      {/* Global CSS for Clean A4 Printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-admission-form, #printable-admission-form * {
            visibility: visible;
          }
          #printable-admission-form {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentAdmissionFormPrint;

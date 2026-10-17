import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileDown, GraduationCap, Mail, MapPin, Phone, Printer, ShieldCheck, User, Users, X } from 'lucide-react';
import { downloadPendingStudentsPDF } from '../utils/pendingApprovalsPDF';

const PendingStudentsPrintModal = ({ pendingUsers = [], onClose }) => {
  const printRef = useRef(null);

  // Prevent background body scroll while modal is active
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const pendingStudents = pendingUsers.filter((u) => {
    const role = (u.role || '').replace('PENDING_', '');
    return role === 'STUDENT' || (!role && u.student);
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    downloadPendingStudentsPDF(pendingUsers);
  };

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-[#1b2a29]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] my-auto flex flex-col overflow-hidden animate-fade-in text-slate-800 text-left border border-slate-200 relative z-[100000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-amber-400" size={20} />
            <h3 className="font-bold text-sm sm:text-base tracking-wide !text-white m-0">
              Pending Student Approvals Master Dossier ({pendingStudents.length} Students)
            </h3>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadPDF}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Download clean formatted PDF document"
            >
              <FileDown size={15} />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Printer size={15} />
              <span>Print / Save</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div
          ref={printRef}
          id="printable-pending-students"
          className="p-6 sm:p-10 overflow-y-auto space-y-6 bg-white text-slate-900 print:p-0 print:space-y-4 print:overflow-visible"
        >
          {/* Document Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                HARI PUSHP PG GIRLS HOSTEL
              </h1>
              <p className="text-xs font-bold text-slate-600 tracking-wider uppercase mt-0.5">
                Executive Student Residences &bull; Warden & Administrative Division
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                University Campus Road, Education Hub, Rajasthan &bull; Contact: +91 98100 33331
              </p>
            </div>

            <div className="text-right flex flex-col items-end shrink-0">
              <span className="bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Pending Approvals Report
              </span>
              <span className="text-xs font-mono font-bold text-slate-700 mt-2">
                Total Pending: <strong className="text-slate-900 font-black">{pendingStudents.length} Students</strong>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Date: {todayStr}</span>
            </div>
          </div>

          {/* Report Title Bar */}
          <div className="bg-slate-100 border border-slate-300 py-2 px-4 text-center rounded-lg">
            <h2 className="text-xs sm:text-sm font-black tracking-widest text-slate-900 uppercase m-0">
              CANDIDATE ADMISSION REGISTRATIONS AWAITING ROOM ALLOTMENT & APPROVAL
            </h2>
          </div>

          {/* Student Dossier Cards List */}
          <div className="space-y-4">
            {pendingStudents.map((u, idx) => {
              const s = u.student || {};
              const appliedDate = u.createdAt
                ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'N/A';
              const joiningDate = s.dateOfJoining
                ? new Date(s.dateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'N/A';
              const dob = s.dob
                ? new Date(s.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'N/A';

              return (
                <div
                  key={u.id}
                  className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50/50 print:border-slate-400 print:break-inside-avoid"
                >
                  {/* Card Header */}
                  <div className="bg-slate-200/80 px-4 py-2 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 m-0">
                        {u.name}
                      </h3>
                      <span className="text-xs text-slate-500 font-mono">({u.email})</span>
                    </div>
                    <div className="text-xs text-slate-600 font-semibold">
                      Applied On: <span className="font-bold text-slate-800">{appliedDate}</span>
                    </div>
                  </div>

                  {/* Card Body Grid */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    {/* Column 1: Student Details */}
                    <div className="space-y-1.5 border-r border-slate-200 pr-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Student Contact & Profile
                      </span>
                      <p className="m-0"><strong>Mobile:</strong> {s.phoneNumber || 'N/A'}</p>
                      <p className="m-0"><strong>DOB:</strong> {dob}</p>
                      <p className="m-0"><strong>Blood Group:</strong> {s.bloodGroup || 'N/A'}</p>
                      <p className="m-0"><strong>Marital Status:</strong> {s.maritalStatus || 'Unmarried'}</p>
                      <p className="m-0"><strong>Joining Date:</strong> {joiningDate}</p>
                    </div>

                    {/* Column 2: Family Details */}
                    <div className="space-y-1.5 border-r border-slate-200 pr-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Parents & Guardians
                      </span>
                      <p className="m-0"><strong>Father:</strong> {s.fatherName || 'N/A'}</p>
                      <p className="m-0"><strong>Parent Contact:</strong> {s.parentContact || 'N/A'}</p>
                      <p className="m-0"><strong>Mother:</strong> {s.motherName || 'N/A'} {s.motherContact ? `(${s.motherContact})` : ''}</p>
                      <p className="m-0"><strong>Sibling Phone:</strong> {s.siblingContact || 'N/A'}</p>
                      <p className="m-0"><strong>Emergency:</strong> {s.emergencyContact || 'N/A'}</p>
                    </div>

                    {/* Column 3: College & Address */}
                    <div className="space-y-1.5 border-r border-slate-200 pr-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Academic & Residential
                      </span>
                      <p className="m-0"><strong>College / Org:</strong> {s.coachingCollege || 'N/A'}</p>
                      <p className="m-0"><strong>Address:</strong> {s.permanentAddress || 'N/A'}</p>
                      <p className="m-0"><strong>State:</strong> {s.state || 'N/A'}</p>
                      <p className="m-0"><strong>PIN Code:</strong> {s.pincode || 'N/A'}</p>
                    </div>

                    {/* Column 4: Admin Approval Signoff Box */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center border-b pb-1">
                        Warden Verification
                      </span>
                      <div className="space-y-1 text-[11px] my-1">
                        <div>[ &nbsp; ] Approved &nbsp;&nbsp; [ &nbsp; ] Rejected</div>
                        <div>Floor: ________ &nbsp; Room: ________</div>
                      </div>
                      <div className="text-[10px] text-slate-400 pt-1 border-t">
                        Sign: ____________________
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Official Footer */}
          <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center text-xs text-slate-500">
            <span>Hari Pushp Tower Girls Hostel &bull; Official Confidential Record</span>
            <span>Generated on {todayStr}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PendingStudentsPrintModal;

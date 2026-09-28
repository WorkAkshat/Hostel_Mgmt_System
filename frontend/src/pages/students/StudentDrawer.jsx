import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BedDouble, CalendarDays, Check, IdCard, Mail, Pencil, Phone, PhoneCall,
  Printer, ReceiptText, Trash2, Wrench, X, GraduationCap, MapPin,
} from 'lucide-react';
import Drawer from '../../components/ui/Drawer';
import Avatar from '../../components/ui/Avatar';
import { useToast } from '../../components/ui/Toast';
import { students as studentsApi } from '../../utils/api';
import { DOCUMENT_TYPES, STUDENT_STATUS, priceFor } from '../../config/hostel';

const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

const ageFrom = (dob) => {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 86400000));
};

const Row = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[var(--border-color)] last:border-b-0">
    <dt className="text-[13px] text-[var(--text-tertiary)] shrink-0">{label}</dt>
    <dd className="m-0 text-[14px] font-medium text-[var(--text-primary)] text-right min-w-0 break-words">
      {children || <span className="text-[var(--text-tertiary)] font-normal">—</span>}
    </dd>
  </div>
);

const Section = ({ title, children }) => (
  <section className="mt-6">
    <h4 className="text-[11px] font-bold text-brand-700 tracking-widest uppercase m-0 mb-1">{title}</h4>
    <dl className="m-0">{children}</dl>
  </section>
);

const PhoneLink = ({ number }) =>
  number ? (
    <a href={`tel:${number}`} className="text-brand-700 hover:underline inline-flex items-center gap-1.5">
      <Phone size={13} /> {number}
    </a>
  ) : null;

const DOC_BADGE = { PENDING: 'badge-warning', VERIFIED: 'badge-success', REJECTED: 'badge-danger' };

const StudentDrawer = ({ student, onClose, onEdit, onDelete, onPrint, onPreview }) => {
  const toast = useToast();
  const [details, setDetails] = useState(null);
  const [detailsFailed, setDetailsFailed] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [busyDoc, setBusyDoc] = useState(null);

  useEffect(() => {
    if (!student) return;
    let cancelled = false;
    setDetails(null);
    setDetailsFailed(false);
    setDocuments([]);
    Promise.all([
      studentsApi.getById(student.id).catch(() => null),
      studentsApi.getStudentDocuments(student.id).catch(() => []),
    ]).then(([full, docs]) => {
      if (cancelled) return;
      setDetails(full);
      setDetailsFailed(!full);
      setDocuments(docs || []);
    });
    return () => { cancelled = true; };
  }, [student]);

  const verify = async (doc, status) => {
    setBusyDoc(doc.id);
    try {
      await studentsApi.verifyDocument(doc.id, status);
      setDocuments((list) => list.map((d) => (d.id === doc.id ? { ...d, status } : d)));
      toast.success(status === 'VERIFIED' ? 'Document verified' : 'Document rejected', DOCUMENT_TYPES[doc.docType] || doc.docType);
    } catch (err) {
      toast.error('Could not update the document', err.message);
    } finally {
      setBusyDoc(null);
    }
  };

  const s = student;
  const status = s ? STUDENT_STATUS[s.status] || STUDENT_STATUS.CHECKED_IN : null;
  const room = s?.room;
  const unpaid = (details?.invoices || []).filter((i) => i.status === 'UNPAID');
  const dues = unpaid.reduce((sum, i) => sum + (i.amount || 0), 0);
  const pendingLeaves = (details?.leaveRequests || []).filter((l) => l.status === 'PENDING').length;
  const openComplaints = (details?.complaints || []).filter((c) => c.status !== 'RESOLVED').length;
  const age = ageFrom(s?.dob);
  const pending = detailsFailed ? '—' : '…';

  const stats = [
    {
      icon: ReceiptText,
      label: 'Fees due',
      value: details ? `₹${dues.toLocaleString('en-IN')}` : pending,
      sub: details ? `${unpaid.length} unpaid` : '',
      bg: dues ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : 'linear-gradient(135deg, #f0f8f7, #dcefec)',
      textColor: dues ? '#92400e' : '#246460',
    },
    {
      icon: CalendarDays,
      label: 'Leaves',
      value: details ? details.leaveRequests?.length ?? 0 : pending,
      sub: details ? `${pendingLeaves} pending` : '',
      bg: 'linear-gradient(135deg, #f6f4fc, #eae5f8)',
      textColor: '#5b4a9a',
    },
    {
      icon: Wrench,
      label: 'Complaints',
      value: details ? details.complaints?.length ?? 0 : pending,
      sub: details ? `${openComplaints} open` : '',
      bg: 'linear-gradient(135deg, #fff6f0, #fde7da)',
      textColor: '#9c4623',
    },
  ];

  return (
    <Drawer
      open={Boolean(s)}
      onClose={onClose}
      title={s?.user?.name || 'Student'}
      header={s && (
        /* ─── Premium gradient profile banner ─── */
        <div
          className="relative overflow-hidden rounded-2xl p-5 mb-1"
          style={{ background: 'linear-gradient(135deg, #246460 0%, #2b7a74 50%, #3a918a 100%)' }}
        >
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-[0.14]"
            style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
          <div className="pointer-events-none absolute bottom-0 left-4 w-24 h-24 rounded-full opacity-[0.08]"
            style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />

          <div className="relative flex items-center gap-4">
            <div className="ring-2 ring-white/30 rounded-2xl shrink-0">
              <Avatar
                name={s.user?.name}
                src={s.user?.avatar || s.profilePic}
                size={60}
                rounded="rounded-2xl"
                onPreview={onPreview}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[18px] font-bold m-0 truncate" style={{ color: '#fff' }}>
                {s.user?.name}
              </h3>
              <p className="text-[13px] m-0 mt-0.5 truncate font-mono" style={{ color: 'rgba(255,255,255,0.72)' }}>
                {s.rollNumber}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {/* Status badge — white pill */}
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                  {status?.label}
                </span>
                {room ? (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                  >
                    <BedDouble size={11} /> Room {room.roomNumber}
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.2)' }}
                  >
                    No room
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick info row */}
          {(s.coachingCollege || s.user?.email) && (
            <div className="relative flex flex-wrap gap-3 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.18)' }}>
              {s.coachingCollege && (
                <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  <GraduationCap size={13} style={{ color: 'rgba(255,255,255,0.6)' }} /> {s.coachingCollege}
                </span>
              )}
              {s.user?.email && (
                <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  <Mail size={13} style={{ color: 'rgba(255,255,255,0.6)' }} /> {s.user.email}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      footer={s && (
        <div className="flex gap-2">
          <button className="btn-brand flex-1 h-11" onClick={() => onEdit(s)}>
            <Pencil size={16} /> Edit details
          </button>
          <button className="btn-secondary h-11 px-4" onClick={() => onPrint(s)} title="Print admission form">
            <Printer size={16} /> <span className="hidden sm:inline">Form</span>
          </button>
          <button
            className="h-11 w-11 rounded-[var(--border-radius-btn)] bg-[var(--danger-bg)] text-[var(--danger)] border-none cursor-pointer flex items-center justify-center hover:brightness-95"
            onClick={() => onDelete(s)}
            aria-label="Delete student"
            title="Delete student"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    >
      {s && (
        <>
          {/* ─── Quick contact ─── */}
          <div className="grid grid-cols-3 gap-2">
            <a
              href={s.phoneNumber ? `tel:${s.phoneNumber}` : undefined}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-[12px] font-semibold transition-colors"
              style={{ background: 'linear-gradient(135deg, #f0f8f7, #dcefec)', color: '#246460' }}
            >
              <PhoneCall size={17} /> Call student
            </a>
            <a
              href={s.parentContact ? `tel:${s.parentContact}` : undefined}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-[12px] font-semibold transition-colors"
              style={{ background: 'linear-gradient(135deg, #f0f8f7, #dcefec)', color: '#246460' }}
            >
              <PhoneCall size={17} /> Call parent
            </a>
            <a
              href={s.user?.email ? `mailto:${s.user.email}` : undefined}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-[12px] font-semibold transition-colors"
              style={{ background: 'linear-gradient(135deg, #f0f8f7, #dcefec)', color: '#246460' }}
            >
              <Mail size={17} /> Email
            </a>
          </div>

          {/* ─── At a glance stats ─── */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {stats.map(({ icon: Icon, label, value, sub, bg, textColor }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="rounded-xl p-3"
                style={{ background: bg }}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-medium mb-1" style={{ color: textColor, opacity: 0.75 }}>
                  <Icon size={12} /> {label}
                </div>
                <div className="text-[20px] font-bold leading-none" style={{ color: textColor }}>{value}</div>
                <div className="text-[11px] mt-1" style={{ color: textColor, opacity: 0.65 }}>{sub}</div>
              </motion.div>
            ))}
          </div>

          <Section title="Stay">
            <Row label="Room">{room && `Room ${room.roomNumber}${room.block ? ` · ${room.block}` : ''}`}</Row>
            <Row label="Floor">{room?.floorNumber && `Floor ${room.floorNumber}`}</Row>
            <Row label="Sharing">{room && `${priceFor(room.sharingType).label} · ${room.isAc ? 'AC' : 'Non-AC'}`}</Row>
            <Row label="Monthly fee">{room && `₹${priceFor(room.sharingType).total.toLocaleString('en-IN')}`}</Row>
            <Row label="Bed">{s.bedId}</Row>
            <Row label="Joined">{fmtDate(s.dateOfJoining)}</Row>
          </Section>

          <Section title="Contact">
            <Row label="Email">{s.user?.email}</Row>
            <Row label="Student phone"><PhoneLink number={s.phoneNumber} /></Row>
            <Row label="Parent phone"><PhoneLink number={s.parentContact} /></Row>
            <Row label="Mother">{[s.motherName, s.motherContact].filter(Boolean).join(' · ')}</Row>
            <Row label="Sibling phone"><PhoneLink number={s.siblingContact} /></Row>
            <Row label="Emergency">{s.emergencyContact}</Row>
          </Section>

          <Section title="Personal">
            <Row label="Father">{s.fatherName}</Row>
            <Row label="Date of birth">{s.dob && `${fmtDate(s.dob)}${age ? ` (${age} yrs)` : ''}`}</Row>
            <Row label="Blood group">{s.bloodGroup}</Row>
            <Row label="Marital status">{s.maritalStatus}</Row>
            <Row label="College / company">{s.coachingCollege}</Row>
            <Row label="Course">{s.course}</Row>
            <Row label="Address">
              {[s.permanentAddress, s.state, s.pincode].filter(Boolean).join(', ')}
            </Row>
          </Section>

          {/* ─── ID documents ─── */}
          <section className="mt-6">
            <h4 className="text-[11px] font-bold text-brand-700 tracking-widest uppercase m-0 mb-2">ID documents</h4>
            {documents.length === 0 ? (
              <p className="text-[13px] text-[var(--text-tertiary)] m-0 py-2">No documents submitted yet. Students add these from the mobile app.</p>
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col gap-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)]">
                    <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #f6f4fc, #eae5f8)', color: '#5b4a9a' }}>
                      <IdCard size={17} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold">{DOCUMENT_TYPES[doc.docType] || doc.docType}</span>
                      <span className="block text-[12px] text-[var(--text-tertiary)] font-mono truncate">{doc.documentNumber}</span>
                    </span>
                    {doc.status === 'PENDING' ? (
                      <span className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => verify(doc, 'VERIFIED')}
                          disabled={busyDoc === doc.id}
                          className="h-8 px-2.5 rounded-lg bg-brand-600 text-white text-[12px] font-semibold border-none cursor-pointer flex items-center gap-1 disabled:opacity-60"
                        >
                          <Check size={13} /> Verify
                        </button>
                        <button
                          onClick={() => verify(doc, 'REJECTED')}
                          disabled={busyDoc === doc.id}
                          aria-label="Reject document"
                          className="h-8 w-8 rounded-lg bg-[var(--danger-bg)] text-[var(--danger)] border-none cursor-pointer flex items-center justify-center disabled:opacity-60"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ) : (
                      <span className={`badge ${DOC_BADGE[doc.status] || 'badge-info'} shrink-0`}>{doc.status.toLowerCase()}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </Drawer>
  );
};

export default StudentDrawer;

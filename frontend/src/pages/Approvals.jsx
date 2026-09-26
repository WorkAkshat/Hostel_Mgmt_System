import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, Briefcase, Check, CircleCheck, FileText, GraduationCap, IdCard, Phone, Printer, RefreshCw, ShieldCheck, TriangleAlert, UserPen, X,
} from 'lucide-react';
import { auth as authApi, rooms as roomsApi, students as studentsApi } from '../utils/api';
import StudentAdmissionFormPrint from '../components/StudentAdmissionFormPrint';
import Avatar from '../components/ui/Avatar';
import ImageLightbox from '../components/ui/ImageLightbox';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FilterChips from '../components/ui/FilterChips';
import { useToast } from '../components/ui/Toast';
import ApproveRegistrationModal, { requestedRole } from './approvals/ApproveRegistrationModal';
import { DOCUMENT_TYPES } from '../config/hostel';

const timeAgo = (value) => {
  if (!value) return '';
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 60) return minutes < 1 ? 'just now' : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const PROFILE_FIELDS = {
  phoneNumber: 'Phone',
  parentContact: 'Parent phone',
  fatherName: "Father's name",
  coachingCollege: 'College / company',
  permanentAddress: 'Address',
  state: 'State',
  pincode: 'PIN code',
};

// Shape a pending user into what the admission form printer expects
const printPayload = (user, form, rooms) => {
  const s = user.student || {};
  const roomId = form?.roomId || s.roomId;
  const room = (roomId && rooms.find((r) => r.id === roomId)) || s.room || null;
  return {
    ...s,
    ...(form || {}),
    name: user.name,
    email: user.email,
    user: { name: user.name, email: user.email, avatar: user.avatar || s.profilePic },
    rollNumber: s.rollNumber || 'Assigned on approval',
    room,
  };
};

const Empty = ({ icon: Icon, title, text }) => (
  <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-12 flex flex-col items-center text-center gap-2.5">
    <span className="w-14 h-14 rounded-full bg-[var(--success-bg)] text-[var(--success)] flex items-center justify-center"><Icon size={24} /></span>
    <h3 className="text-[16px] font-bold m-0">{title}</h3>
    <p className="text-[14px] text-[var(--text-secondary)] m-0 max-w-sm">{text}</p>
  </div>
);

const SourceError = ({ message, onRetry }) => (
  <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
    <TriangleAlert size={17} className="shrink-0" />
    <span className="flex-1">{message}</span>
    <button onClick={onRetry} className="font-semibold underline bg-transparent border-none cursor-pointer text-[var(--danger)]">Retry</button>
  </div>
);

const listItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: 40, transition: { duration: 0.2 } },
};

const Approvals = () => {
  const toast = useToast();
  const [tab, setTab] = useState('registrations');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [profileRequests, setProfileRequests] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const [reviewing, setReviewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const results = await Promise.allSettled([
      authApi.getPending(),
      studentsApi.getProfileRequests(),
      studentsApi.getDocuments('PENDING'),
      studentsApi.getAll(),
      roomsApi.getAll(),
    ]);
    const [users, requests, docs, studentList, roomList] = results;
    const value = (r) => (r.status === 'fulfilled' ? r.value || [] : []);
    setPendingUsers(value(users));
    setProfileRequests(value(requests));
    setDocuments(value(docs));
    setStudents(value(studentList));
    setRooms(value(roomList));
    setErrors({
      registrations: users.status === 'rejected' ? users.reason?.message || 'Could not load registrations.' : null,
      profile: requests.status === 'rejected' ? requests.reason?.message || 'Could not load profile requests.' : null,
      documents: docs.status === 'rejected'
        ? `Could not load ID documents${docs.reason?.status === 404 ? ' — restart the backend so the new documents list is available' : ''}.`
        : null,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const approveRegistration = async (user, form) => {
    await authApi.approve(user.id, form);
    toast.success(`${user.name} approved`, `Access given as ${form.role.toLowerCase()}.`);
    setReviewing(null);
    setPendingUsers((list) => list.filter((u) => u.id !== user.id));
    load();
  };

  const rejectRegistration = async () => {
    try {
      await authApi.reject(rejecting.id);
      toast.success('Registration rejected', `${rejecting.name}'s request has been removed.`);
      setPendingUsers((list) => list.filter((u) => u.id !== rejecting.id));
    } catch (err) {
      toast.error('Could not reject', err.message);
      throw err;
    }
  };

  const decideProfile = async (request, approve) => {
    setBusyId(request.id);
    try {
      if (approve) await studentsApi.approveProfileRequest(request.id);
      else await studentsApi.rejectProfileRequest(request.id);
      setProfileRequests((list) => list.filter((r) => r.id !== request.id));
      toast.success(approve ? 'Profile updated' : 'Request declined', request.studentName);
      if (approve) load();
    } catch (err) {
      toast.error('Could not update the request', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const decideDocument = async (doc, status) => {
    setBusyId(doc.id);
    try {
      await studentsApi.verifyDocument(doc.id, status);
      setDocuments((list) => list.filter((d) => d.id !== doc.id));
      toast.success(status === 'VERIFIED' ? 'Document verified' : 'Document rejected', `${DOCUMENT_TYPES[doc.docType] || doc.docType} · ${doc.student?.user?.name || ''}`);
    } catch (err) {
      toast.error('Could not update the document', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const tabs = [
    { value: 'registrations', label: 'Registrations', count: pendingUsers.length },
    { value: 'profile', label: 'Profile changes', count: profileRequests.length },
    { value: 'documents', label: 'ID documents', count: documents.length },
  ];
  const total = pendingUsers.length + profileRequests.length + documents.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Approvals</h1>
          <p className="page-subtitle">
            {loading ? 'Checking for requests…' : total ? `${total} request${total === 1 ? '' : 's'} waiting for you` : 'Nothing waiting — all requests are handled'}
          </p>
        </div>
        <button className="btn-secondary h-10 self-start sm:self-auto" onClick={() => { setLoading(true); load(); }}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <FilterChips id="approvals-tabs" options={tabs} value={tab} onChange={setTab} />

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[190px] rounded-[var(--border-radius-card)] skeleton-loading" />)}
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-4"
          >
            {/* Registrations */}
            {tab === 'registrations' && (
              <>
                {errors.registrations && <SourceError message={errors.registrations} onRetry={load} />}
                {pendingUsers.length === 0 && !errors.registrations ? (
                  <Empty icon={ShieldCheck} title="No new registrations" text="When someone signs up on the website or app, they will wait here for your approval." />
                ) : (
                  <ul className="list-none m-0 p-0 grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <AnimatePresence initial={false}>
                      {pendingUsers.map((u) => {
                        const role = requestedRole(u);
                        const s = u.student || {};
                        const facts = role === 'STUDENT'
                          ? [['Father', s.fatherName], ['College / company', s.coachingCollege], ['From', s.state], ['Joining', s.dateOfJoining && new Date(s.dateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })]]
                          : [['Department', u.staff?.department], ['Designation', u.staff?.designation]];
                        return (
                          <motion.li key={u.id} layout {...listItem} className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5 flex flex-col gap-4">
                            <div className="flex items-start gap-3.5">
                              <Avatar name={u.name} src={u.avatar || s.profilePic} size={52} rounded="rounded-2xl" onPreview={setPreview} />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-[16px] font-bold m-0 truncate">{u.name}</h3>
                                  <span className={`badge ${role === 'STUDENT' ? 'badge-info' : 'bg-lilac-50 text-lilac-700'}`}>
                                    {role === 'STUDENT' ? <GraduationCap size={12} /> : <Briefcase size={12} />} {role.toLowerCase()}
                                  </span>
                                </div>
                                <p className="text-[13px] text-[var(--text-secondary)] m-0 truncate">{u.email}</p>
                                <p className="text-[12px] text-[var(--text-tertiary)] m-0 mt-0.5 flex items-center gap-1.5">
                                  <Phone size={12} /> {s.phoneNumber || u.staff?.phoneNumber || '—'} · applied {timeAgo(u.createdAt)}
                                </p>
                              </div>
                            </div>
                            <dl className="grid grid-cols-2 gap-2 m-0">
                              {facts.map(([label, value]) => (
                                <div key={label} className="rounded-xl bg-mint-50 px-3 py-2 min-w-0">
                                  <dt className="text-[11px] text-[var(--text-tertiary)]">{label}</dt>
                                  <dd className="m-0 text-[13px] font-semibold truncate">{value || '—'}</dd>
                                </div>
                              ))}
                            </dl>
                            <div className="flex gap-2 mt-auto">
                              <button className="btn-primary flex-1 h-10" onClick={() => setReviewing(u)}>
                                <span className="sm:hidden">Review</span>
                                <span className="hidden sm:inline">Review & approve</span>
                                <ArrowRight size={15} />
                              </button>
                              {role === 'STUDENT' && (
                                <button className="btn-secondary h-10 px-3" onClick={() => setPrinting(printPayload(u, null, rooms))} title="Print admission form" aria-label="Print admission form">
                                  <Printer size={16} />
                                </button>
                              )}
                              <button
                                className="h-10 px-3 rounded-[var(--border-radius-btn)] bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-semibold border-none cursor-pointer flex items-center gap-1.5 hover:brightness-95"
                                onClick={() => setRejecting(u)}
                              >
                                <X size={15} /> Reject
                              </button>
                            </div>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                )}
              </>
            )}

            {/* Profile change requests */}
            {tab === 'profile' && (
              <>
                {errors.profile && <SourceError message={errors.profile} onRetry={load} />}
                {profileRequests.length === 0 && !errors.profile ? (
                  <Empty icon={UserPen} title="No profile changes to review" text="Students can ask to update their phone, address or college from the app. Their requests show up here." />
                ) : (
                  <ul className="list-none m-0 p-0 grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <AnimatePresence initial={false}>
                      {profileRequests.map((r) => {
                        const current = studentById.get(r.studentId);
                        const changes = Object.entries(PROFILE_FIELDS)
                          .map(([key, label]) => ({ key, label, from: current?.[key] || '', to: r.requestedChanges?.[key] || '' }))
                          .filter((c) => c.to && c.to !== c.from);
                        return (
                          <motion.li key={r.id} layout {...listItem} className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={r.studentName} src={current?.user?.avatar || current?.profilePic} size={44} tone="lilac" onPreview={setPreview} />
                              <div className="flex-1 min-w-0">
                                <h3 className="text-[15px] font-bold m-0 truncate">{r.studentName}</h3>
                                <p className="text-[12px] text-[var(--text-tertiary)] m-0">
                                  {r.studentRoll}{current?.room ? ` · Room ${current.room.roomNumber}` : ''} · {timeAgo(r.createdAt)}
                                </p>
                              </div>
                              <span className="badge bg-lilac-50 text-lilac-700 normal-case">{changes.length} change{changes.length === 1 ? '' : 's'}</span>
                            </div>
                            {changes.length === 0 ? (
                              <p className="text-[13px] text-[var(--text-secondary)] m-0">The requested values are the same as the current profile.</p>
                            ) : (
                              <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
                                {changes.map((c) => (
                                  <div key={c.key} className="grid grid-cols-[110px_1fr] sm:grid-cols-[130px_1fr] gap-3 px-3.5 py-2.5 border-b border-[var(--border-color)] last:border-b-0 text-[13px]">
                                    <span className="text-[var(--text-tertiary)]">{c.label}</span>
                                    <span className="min-w-0">
                                      {c.from && <span className="block text-[var(--text-tertiary)] line-through truncate">{c.from}</span>}
                                      <span className="block font-semibold text-[var(--success)] break-words">{c.to}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2 mt-auto">
                              <button className="btn-brand flex-1 h-10" disabled={busyId === r.id} onClick={() => decideProfile(r, true)}>
                                <Check size={16} /> {busyId === r.id ? 'Saving…' : 'Apply changes'}
                              </button>
                              <button
                                className="h-10 px-4 rounded-[var(--border-radius-btn)] bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-semibold border-none cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                                disabled={busyId === r.id}
                                onClick={() => decideProfile(r, false)}
                              >
                                <X size={15} /> Decline
                              </button>
                            </div>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                )}
              </>
            )}

            {/* ID documents */}
            {tab === 'documents' && (
              <>
                {errors.documents && <SourceError message={errors.documents} onRetry={load} />}
                {documents.length === 0 && !errors.documents ? (
                  <Empty icon={CircleCheck} title="All documents checked" text="Aadhaar, PAN and passport numbers that students submit will appear here for verification." />
                ) : documents.length > 0 && (
                  <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] overflow-hidden">
                    <ul className="list-none m-0 p-0">
                      <AnimatePresence initial={false}>
                        {documents.map((d) => (
                          <motion.li key={d.id} layout {...listItem} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-[var(--border-color)] last:border-b-0">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="w-10 h-10 rounded-xl bg-lilac-50 text-lilac-700 flex items-center justify-center shrink-0"><IdCard size={18} /></span>
                              <div className="min-w-0">
                                <div className="text-[14px] font-semibold truncate">
                                  {d.student?.user?.name || 'Unknown student'}
                                  <span className="font-normal text-[var(--text-tertiary)]"> · {DOCUMENT_TYPES[d.docType] || d.docType}</span>
                                </div>
                                <div className="text-[12px] text-[var(--text-tertiary)] flex flex-wrap gap-x-2">
                                  <span className="font-mono text-[var(--text-secondary)]">{d.documentNumber}</span>
                                  {d.student?.rollNumber && <span>{d.student.rollNumber}</span>}
                                  {d.student?.room && <span>Room {d.student.room.roomNumber}</span>}
                                  <span>{timeAgo(d.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button className="btn-brand h-9 px-3 text-[13px] flex-1 sm:flex-none" disabled={busyId === d.id} onClick={() => decideDocument(d, 'VERIFIED')}>
                                <Check size={15} /> Verify
                              </button>
                              <button
                                className="h-9 px-3 rounded-[var(--border-radius-btn)] bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-none disabled:opacity-60"
                                disabled={busyId === d.id}
                                onClick={() => decideDocument(d, 'REJECTED')}
                              >
                                <X size={15} /> Reject
                              </button>
                            </div>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </div>
                )}
                <p className="text-[12px] text-[var(--text-tertiary)] m-0 flex items-center gap-1.5">
                  <FileText size={13} /> Each student's documents can also be checked from her profile on the Students page.
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <ApproveRegistrationModal
        user={reviewing}
        rooms={rooms}
        onClose={() => setReviewing(null)}
        onApprove={approveRegistration}
        onPrint={(u, form) => setPrinting(printPayload(u, form, rooms))}
        onPreview={setPreview}
      />

      <ConfirmDialog
        open={Boolean(rejecting)}
        title={`Reject ${rejecting?.name || 'this registration'}?`}
        message="Their pending account will be deleted. They will need to register again."
        confirmLabel="Reject registration"
        onConfirm={rejectRegistration}
        onClose={() => setRejecting(null)}
      />

      <ImageLightbox image={preview} onClose={() => setPreview(null)} />

      {printing && <StudentAdmissionFormPrint student={printing} onClose={() => setPrinting(null)} />}
    </div>
  );
};

export default Approvals;

import { useEffect, useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  BedDouble,
  Building2,
  Camera,
  ChevronRight,
  CircleCheck,
  Clock,
  FilePen,
  IdCard,
  Images,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Upload,
  User,
  UserRound,
  XCircle,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { authApi, dashboardApi, studentsApi } from '../api';
import { asList } from '../api/client';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/query';
import { fmtDate, timeAgo } from '../lib/format';
import { DOCUMENT_TYPES, STUDENT_STATUS, priceFor } from '../lib/hostel';
import { colors, radius } from '../ui/theme';
import { Avatar, Badge, Button, Card, Divider, IconButton, IconTile, Press, Row, T } from '../ui/primitives';
import { Choices, Field, Input, digits } from '../ui/form';
import { ErrorBox, Loading, useToast } from '../ui/feedback';
import { Appear, ListRow, Screen, Section } from '../ui/layout';
import { Sheet } from '../ui/Sheet';
import ProfileHero from '../features/ProfileHero';
import AccountSettings from '../features/AccountSettings';
import { go } from '../lib/nav';

const EDITABLE = [
  { key: 'phoneNumber', label: 'Your phone', kind: 'phone', section: 'Personal' },
  { key: 'bloodGroup', label: 'Blood group', section: 'Personal' },
  { key: 'emergencyContact', label: 'Emergency phone', kind: 'phone', section: 'Personal' },
  { key: 'fatherName', label: "Father's name", section: 'Family' },
  { key: 'parentContact', label: "Father's phone", kind: 'phone', section: 'Family' },
  { key: 'motherName', label: "Mother's name", section: 'Family' },
  { key: 'motherContact', label: "Mother's phone", kind: 'phone', section: 'Family' },
  { key: 'coachingCollege', label: 'College / company', section: 'Academic' },
  { key: 'course', label: 'Course / degree', section: 'Academic' },
  { key: 'permanentAddress', label: 'Home address', section: 'Address' },
  { key: 'state', label: 'State', section: 'Address' },
  { key: 'pincode', label: 'PIN code', kind: 'pin', section: 'Address' },
] as const;

const LABEL: Record<string, string> = Object.fromEntries(EDITABLE.map((f) => [f.key, f.label]));
const REQ = {
  PENDING: { label: 'Waiting for warden', tone: 'warning' as const, icon: Clock },
  APPROVED: { label: 'Approved & saved', tone: 'success' as const, icon: CircleCheck },
  REJECTED: { label: 'Not approved', tone: 'danger' as const, icon: XCircle },
};
const DOC = {
  PENDING: { label: 'Being verified', tone: 'warning' as const },
  VERIFIED: { label: 'Verified', tone: 'success' as const },
  REJECTED: { label: 'Rejected — replace', tone: 'danger' as const },
};

const Info = ({ label, value }: { label: string; value?: string | null }) => (
  <View style={{ paddingVertical: 10, gap: 2 }}>
    <T v="caption" c={colors.text3}>{label}</T>
    <T v="title" c={value ? colors.text : colors.text3} w={value ? 'semibold' : 'regular'}>{value || 'Not added'}</T>
  </View>
);

export default function Profile() {
  const { user, updateUser } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const qc = useQueryClient();
  const toast = useToast();

  const dash = useData(['dashboard'], dashboardApi.get, { enabled: isStudent && !user?.studentDetails?.id });
  const id = user?.studentDetails?.id || dash.data?.profile?.id;
  const student = useData(['student', id], () => studentsApi.byId(id), { enabled: isStudent && !!id });
  const requests = useData(['my-profile-requests'], studentsApi.myProfileRequests, { enabled: isStudent });
  const docs = useData(['my-documents', id], () => studentsApi.studentDocuments(id), { enabled: isStudent && !!id });

  // Student sheets
  const [editing, setEditing] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [viewingHistory, setViewingHistory] = useState<any>(null);
  const [viewingRequest, setViewingRequest] = useState<any>(null);

  // Warden sheets
  const [wardenEditOpen, setWardenEditOpen] = useState(false);
  const [wardenName, setWardenName] = useState(user?.name || '');
  const [wardenPhone, setWardenPhone] = useState((user as any)?.phoneNumber || (user as any)?.phone || '');
  const [wardenEmergency, setWardenEmergency] = useState((user as any)?.emergencyContact || '');
  const [savingWarden, setSavingWarden] = useState(false);

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handlePickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return toast.error('Permission needed', 'Please allow gallery access to choose a profile photo.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      const fileData = asset.base64 ? `data:${mime};base64,${asset.base64}` : asset.uri;

      setUploadingAvatar(true);
      try {
        const res = await authApi.updateProfile({ avatarData: fileData });
        if (updateUser && res) {
          updateUser(res);
        }
        await qc.invalidateQueries({ queryKey: ['student', id] });
        await qc.invalidateQueries({ queryKey: ['dashboard'] });
        toast.success('Updated', 'Profile picture changed successfully');
      } catch (e: any) {
        toast.error('Failed', e.message || 'Could not update profile photo');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleSaveWarden = async () => {
    if (!wardenName.trim()) {
      return toast.error('Required', 'Please enter your name');
    }
    setSavingWarden(true);
    try {
      const res = await authApi.updateProfile({
        name: wardenName.trim(),
        phoneNumber: wardenPhone.trim(),
        emergencyContact: wardenEmergency.trim(),
      });
      if (updateUser && res) {
        updateUser(res);
      }
      toast.success('Saved', 'Profile details updated');
      setWardenEditOpen(false);
    } catch (e: any) {
      toast.error('Failed', e.message || 'Could not update details');
    } finally {
      setSavingWarden(false);
    }
  };

  // ── WARDEN / ADMIN VIEW ──
  if (!isStudent) {
    return (
      <Screen title="My profile" subtitle="Account details & settings" back tabBar={false}>
        <Appear>
          <ProfileHero
            name={user?.name}
            avatar={user?.avatar}
            line1={user?.email}
            line2={(user as any)?.phoneNumber || (user as any)?.phone || 'Hari Pushp Tower'}
            pill={user?.assignedFloor ? `Floor ${user.assignedFloor} Warden` : user?.role === 'ADMIN' ? 'Chief Warden' : 'Staff'}
            onAvatarPress={handlePickAvatar}
          />
        </Appear>

        <Appear i={1}>
          <Section
            title="Account details"
            action="Edit details"
            onAction={() => {
              setWardenName(user?.name || '');
              setWardenPhone((user as any)?.phoneNumber || (user as any)?.phone || '');
              setWardenEmergency((user as any)?.emergencyContact || '');
              setWardenEditOpen(true);
            }}
          >
            <Press
              onPress={() => {
                setWardenName(user?.name || '');
                setWardenPhone((user as any)?.phoneNumber || (user as any)?.phone || '');
                setWardenEmergency((user as any)?.emergencyContact || '');
                setWardenEditOpen(true);
              }}
              style={{ borderRadius: radius.card }}
            >
              <Card padded style={{ paddingVertical: 4 }}>
                <Info label="Full Name" value={user?.name} /><Divider />
                <Info label="Phone number" value={(user as any)?.phoneNumber || (user as any)?.phone} /><Divider />
                <Info label="Email address" value={user?.email} /><Divider />
                <Info label="Emergency / Alternate phone" value={(user as any)?.emergencyContact} /><Divider />
                <Info label="Role & responsibility" value={user?.assignedFloor ? `Floor ${user.assignedFloor} Warden` : 'Chief Warden / Administrator'} /><Divider />
                <Info label="Hostel premises" value="Hari Pushp Tower (Sector 4, Jaipur)" />
              </Card>
            </Press>
          </Section>
        </Appear>

        <Appear i={2}>
          <Section title="Hostel quick links">
            <Card padded={false}>
              <ListRow icon={Images} tone="mint" title="PG Photos & Videos" sub="Upload room photos and hostel tour" onPress={() => go('/gallery')} />
              <Divider />
              <ListRow icon={ShieldCheck} tone="lilac" title="Helpline & Rules" sub="24x7 support & hostel guidelines" onPress={() => go('/helpline')} />
              <Divider />
              <ListRow icon={UserRound} tone="peach" title="Resident Directory" sub="Room list, fees, gate passes" onPress={() => go('/warden/residents')} />
            </Card>
          </Section>
        </Appear>

        <Appear i={3}>
          <AccountSettings />
        </Appear>

        {/* Warden Edit Profile Sheet */}
        <Sheet
          open={wardenEditOpen}
          onClose={() => setWardenEditOpen(false)}
          title="Edit Profile Details"
          subtitle="Update your contact information"
          footer={
            <Button
              title={savingWarden ? 'Saving…' : 'Save Details'}
              icon={Pencil}
              onPress={handleSaveWarden}
              loading={savingWarden}
              full
            />
          }
        >
          <Field label="Full Name" required>
            <Input
              value={wardenName}
              onChangeText={setWardenName}
              placeholder="e.g. Dr. Shalini Sharma"
            />
          </Field>
          <Field label="Phone Number" required>
            <Input
              value={wardenPhone}
              onChangeText={setWardenPhone}
              placeholder="e.g. 9460191558"
              keyboardType="phone-pad"
            />
          </Field>
          <Field label="Emergency / Alternate Contact">
            <Input
              value={wardenEmergency}
              onChangeText={setWardenEmergency}
              placeholder="e.g. 9001236013"
              keyboardType="phone-pad"
            />
          </Field>
        </Sheet>
      </Screen>
    );
  }

  // ── STUDENT VIEW ──
  const s = student.data;
  const pending = asList(requests.data).find((r: any) => r.status === 'PENDING');
  const st = s ? STUDENT_STATUS[s.status] || { label: s.status, tone: 'white' as const } : null;

  return (
    <Screen
      title="My profile"
      subtitle="Resident information & documents"
      back
      tabBar={false}
      onRefresh={() => Promise.all([student.refetch(), requests.refetch(), docs.refetch()])}
    >
      {student.error ? (
        <ErrorBox message={(student.error as Error).message} onRetry={student.refetch} />
      ) : !s ? (
        <Loading rows={3} h={140} />
      ) : (
        <>
          <ProfileHero
            name={s.user?.name}
            avatar={s.profilePic || s.user?.avatar}
            line1={s.rollNumber}
            line2={[s.user?.email, s.dateOfJoining ? `Joined ${fmtDate(s.dateOfJoining, { year: 'numeric' })}` : ''].filter(Boolean).join(' · ')}
            pill={st?.label}
            cells={[
              { k: 'Room', v: String(s.room?.roomNumber || '—') },
              { k: 'Bed', v: s.bedId ? String(s.bedId).split('-').pop() || '—' : '—' },
              { k: 'Floor', v: String(s.room?.floorNumber || '—') },
            ]}
            onAvatarPress={handlePickAvatar}
          />

          {pending && (
            <Card tone="sun" style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Clock size={18} color={colors.sun800} />
              <T v="small" c={colors.sun900} style={{ flex: 1 }}>
                Your change request from {timeAgo(pending.createdAt)} is waiting for warden approval.
              </T>
            </Card>
          )}

          {/* Personal & Contact Details */}
          <Section
            title="Personal & contact"
            action={pending ? undefined : 'Edit'}
            onAction={() => setEditing(true)}
          >
            <Press onPress={() => !pending && setEditing(true)} style={{ borderRadius: radius.card }}>
              <Card padded style={{ paddingVertical: 4 }}>
                <Info label="Full Name" value={s.user?.name} /><Divider />
                <Info label="Your phone" value={s.phoneNumber} /><Divider />
                <Info label="Email address" value={s.user?.email} /><Divider />
                <Info label="Date of birth" value={s.dob ? fmtDate(s.dob) : 'Not specified'} /><Divider />
                <Info label="Blood group" value={s.bloodGroup} /><Divider />
                <Info label="Emergency contact phone" value={s.emergencyContact} />
              </Card>
            </Press>
          </Section>

          {/* Family & Guardian Details */}
          <Section
            title="Family & guardian"
            action={pending ? undefined : 'Edit'}
            onAction={() => setEditing(true)}
          >
            <Press onPress={() => !pending && setEditing(true)} style={{ borderRadius: radius.card }}>
              <Card padded style={{ paddingVertical: 4 }}>
                <Info label="Father's name" value={s.fatherName} /><Divider />
                <Info label="Parent phone" value={s.parentContact} /><Divider />
                <Info label="Mother's name" value={s.motherName} /><Divider />
                <Info label="Mother's phone" value={s.motherContact} />
              </Card>
            </Press>
          </Section>

          {/* Home Address & Academic */}
          <Section
            title="Home address & college"
            action={pending ? undefined : 'Edit'}
            onAction={() => setEditing(true)}
          >
            <Press onPress={() => !pending && setEditing(true)} style={{ borderRadius: radius.card }}>
              <Card padded style={{ paddingVertical: 4 }}>
                <Info label="Permanent address" value={s.permanentAddress} /><Divider />
                <Info label="State & PIN" value={[s.state, s.pincode].filter(Boolean).join(' · ')} /><Divider />
                <Info label="College / company" value={s.coachingCollege} /><Divider />
                <Info label="Course / department" value={s.course} />
              </Card>
            </Press>
          </Section>

          {/* Hostel Stay & Room Details */}
          <Section title="Hostel stay details">
            <Card padded style={{ paddingVertical: 4 }}>
              <Info label="Allocated room" value={s.room ? `Room ${s.room.roomNumber} (Floor ${s.room.floorNumber})` : 'Not allocated yet'} /><Divider />
              <Info label="Sharing type & AC" value={s.room ? `${s.room.sharingType} sharing · ${s.room.isAc ? 'Air Conditioned' : 'Non-AC'}` : '—'} /><Divider />
              <Info label="Date of joining" value={s.dateOfJoining ? fmtDate(s.dateOfJoining) : '—'} /><Divider />
              <Info label="Monthly room rent" value={s.room ? `₹${priceFor(s.room.sharingType).total.toLocaleString('en-IN')}/mo` : '—'} />
            </Card>
          </Section>

          {/* Room History */}
          {((s.roomHistory && s.roomHistory.length > 0) || s.room) && (
            <Section title="Room allocation history">
              <Card padded={false}>
                {((s.roomHistory && s.roomHistory.length > 0) ? s.roomHistory : [{
                  id: 'initial',
                  fromRoomNo: null,
                  toRoomNo: s.room?.roomNumber,
                  changedAt: s.roomAssignedAt || s.dateOfJoining || s.createdAt,
                  reason: 'Current room allotment',
                }]).map((h: any, idx: number, arr: any[]) => {
                  const title = h.fromRoomNo && h.toRoomNo
                    ? `Room ${h.fromRoomNo} → Room ${h.toRoomNo}`
                    : h.toRoomNo
                    ? `Allocated Room ${h.toRoomNo}`
                    : `Moved out of Room ${h.fromRoomNo || ''}`;
                  return (
                    <View key={h.id || idx}>
                      <Press onPress={() => setViewingHistory(h)} style={{ padding: 12 }}>
                        <Row style={{ alignItems: 'center' }} gap={10}>
                          <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' }}>
                            <BedDouble size={16} color={colors.brand700} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <T v="title" w="bold">{title}</T>
                            <T v="caption" c={colors.text3}>{h.reason || 'Room change'}</T>
                          </View>
                          <Badge label={fmtDate(h.changedAt)} tone="mint" />
                          <ChevronRight size={16} color={colors.text3} />
                        </Row>
                      </Press>
                      {idx < arr.length - 1 && <Divider />}
                    </View>
                  );
                })}
              </Card>
            </Section>
          )}

          {/* ID Documents */}
          <Section title="ID documents" action="+ Add ID" onAction={() => setAddingDoc(true)}>
            {asList(docs.data).length === 0 ? (
              <Press onPress={() => setAddingDoc(true)}>
                <Card style={{ alignItems: 'center', padding: 18, gap: 6 }}>
                  <IdCard size={28} color={colors.text3} />
                  <T v="small" c={colors.text2} center>No ID document added yet. Tap to add Aadhaar or government ID.</T>
                  <Button title="Add ID Document" small icon={Upload} onPress={() => setAddingDoc(true)} style={{ marginTop: 4 }} />
                </Card>
              </Press>
            ) : asList(docs.data).map((d: any) => (
              <Press key={d.id} onPress={() => setViewingDoc(d)}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <IconTile icon={d.status === 'VERIFIED' ? ShieldCheck : IdCard} tone={d.status === 'VERIFIED' ? 'success' : 'mint'} />
                  <View style={{ flex: 1 }}>
                    <T v="title">{DOCUMENT_TYPES[d.docType] || d.docType}</T>
                    <T v="caption" c={colors.text3}>•••• {String(d.documentNumber).slice(-4)}</T>
                  </View>
                  <Badge label={(DOC as any)[d.status]?.label || d.status} tone={(DOC as any)[d.status]?.tone || 'white'} />
                  <ChevronRight size={16} color={colors.text3} />
                </Card>
              </Press>
            ))}
          </Section>

          {/* Change Requests */}
          {asList(requests.data).length > 0 && (
            <Section title="My change requests">
              {asList(requests.data).slice(0, 5).map((r: any) => {
                const rs = (REQ as any)[r.status] || REQ.PENDING;
                return (
                  <Press key={r.id} onPress={() => setViewingRequest(r)}>
                    <Card style={{ gap: 6 }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <T v="caption" c={colors.text3}>{timeAgo(r.createdAt)}</T>
                        <Badge label={rs.label} tone={rs.tone} icon={rs.icon} />
                      </Row>
                      {Object.entries(r.requestedChanges || {}).filter(([, v]) => v).map(([k, v]) => (
                        <T key={k} v="small">
                          <T v="small" c={colors.text3}>{LABEL[k] || k}: </T>{String(v)}
                        </T>
                      ))}
                    </Card>
                  </Press>
                );
              })}
            </Section>
          )}

          {/* Account & Security */}
          <Appear i={4}>
            <AccountSettings />
          </Appear>
        </>
      )}

      {/* Student Change Request Sheet */}
      <ChangeSheet open={editing} student={s} onClose={() => setEditing(false)} />

      {/* Add Document Sheet */}
      <DocSheet open={addingDoc} onClose={() => setAddingDoc(false)} studentId={id} />

      {/* Document Detail Sheet */}
      <Sheet
        open={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        title={DOCUMENT_TYPES[viewingDoc?.docType] || 'ID Document'}
        subtitle="Resident government verification details"
        footer={
          viewingDoc?.status === 'REJECTED' ? (
            <Button
              title="Replace Document"
              icon={Upload}
              onPress={() => {
                setViewingDoc(null);
                setAddingDoc(true);
              }}
              full
            />
          ) : (
            <Button
              title="Done"
              kind="secondary"
              onPress={() => setViewingDoc(null)}
              full
            />
          )
        }
      >
        {viewingDoc && (
          <View style={{ gap: 12 }}>
            <Card style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <T v="title" w="bold">{DOCUMENT_TYPES[viewingDoc.docType] || viewingDoc.docType}</T>
                <Badge
                  label={(DOC as any)[viewingDoc.status]?.label || viewingDoc.status}
                  tone={(DOC as any)[viewingDoc.status]?.tone || 'white'}
                />
              </Row>
              <Divider />
              <Info label="Document Number" value={viewingDoc.documentNumber} />
              <Divider />
              <Info
                label="Verification Status"
                value={
                  viewingDoc.status === 'VERIFIED'
                    ? 'Verified and approved by the Warden for hostel records.'
                    : viewingDoc.status === 'PENDING'
                    ? 'Being reviewed by the Warden Office.'
                    : 'Rejected. Please submit a valid document number.'
                }
              />
            </Card>
          </View>
        )}
      </Sheet>

      {/* Room Detail Sheet */}
      <Sheet
        open={!!viewingHistory}
        onClose={() => setViewingHistory(null)}
        title={viewingHistory?.toRoomNo ? `Room ${viewingHistory.toRoomNo}` : 'Room Allotment'}
        subtitle="Hostel stay and room history"
        footer={<Button title="Close" kind="secondary" onPress={() => setViewingHistory(null)} full />}
      >
        {viewingHistory && (
          <View style={{ gap: 12 }}>
            <Card style={{ gap: 8 }}>
              <Info label="Allotment" value={viewingHistory.toRoomNo ? `Room ${viewingHistory.toRoomNo}` : '—'} />
              <Divider />
              <Info label="Floor" value={s?.room?.floorNumber ? `Floor ${s.room.floorNumber}` : '—'} />
              <Divider />
              <Info label="Reason / Remarks" value={viewingHistory.reason || 'Current room allotment'} />
              <Divider />
              <Info label="Effective Date" value={fmtDate(viewingHistory.changedAt)} />
              <Divider />
              <Info label="Sharing Type" value={s?.room?.sharingType ? `${s.room.sharingType} sharing` : '—'} />
            </Card>
          </View>
        )}
      </Sheet>

      {/* Change Request Detail Sheet */}
      <Sheet
        open={!!viewingRequest}
        onClose={() => setViewingRequest(null)}
        title="Change Request Details"
        subtitle={viewingRequest ? timeAgo(viewingRequest.createdAt) : ''}
        footer={<Button title="Close" kind="secondary" onPress={() => setViewingRequest(null)} full />}
      >
        {viewingRequest && (
          <View style={{ gap: 12 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <T v="title" w="bold">Request Status</T>
              <Badge
                label={(REQ as any)[viewingRequest.status]?.label || viewingRequest.status}
                tone={(REQ as any)[viewingRequest.status]?.tone || 'white'}
                icon={(REQ as any)[viewingRequest.status]?.icon}
              />
            </Row>
            <Card style={{ gap: 8 }}>
              <T v="caption" c={colors.text3}>Requested Updates:</T>
              {Object.entries(viewingRequest.requestedChanges || {}).filter(([, v]) => v).map(([k, v]) => (
                <View key={k}>
                  <Info label={LABEL[k] || k} value={String(v)} />
                  <Divider />
                </View>
              ))}
              <Info label="Submitted On" value={fmtDate(viewingRequest.createdAt)} />
            </Card>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

// ── COMPONENT FOR EDITING STUDENT PROFILE ──
const ChangeSheet = ({ open, student, onClose }: { open: boolean; student: any; onClose: () => void }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && student) {
      setForm(Object.fromEntries(EDITABLE.map((f) => [f.key, student[f.key] || ''])));
      setError(null);
    }
  }, [open, student]);

  const changed = useMemo(
    () => EDITABLE.filter((f) => String(form[f.key] ?? '').trim() !== String(student?.[f.key] ?? '').trim()),
    [form, student]
  );

  const submit = async () => {
    if (!changed.length) return setError('Change at least one detail first.');
    for (const f of changed) {
      const v = String(form[f.key]).trim();
      if (!v) return setError(`${f.label} cannot be empty.`);
      if ((f as any).kind === 'phone' && v.length !== 10) return setError(`${f.label} must be 10 digits.`);
      if ((f as any).kind === 'pin' && v.length !== 6) return setError('PIN code must be 6 digits.');
    }
    setBusy(true);
    try {
      await studentsApi.requestProfileChange(
        Object.fromEntries(changed.map((f) => [f.key, String(form[f.key]).trim()]))
      );
      toast.success('Request sent', 'You will be notified when the warden approves.');
      await qc.invalidateQueries({ queryKey: ['my-profile-requests'] });
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit Profile Information"
      subtitle="The warden office reviews and applies your changes."
      footer={
        <Button
          title={changed.length ? `Submit ${changed.length} Change${changed.length > 1 ? 's' : ''}` : 'No changes made'}
          icon={FilePen}
          onPress={submit}
          loading={busy}
          disabled={!changed.length}
          full
        />
      }
    >
      {EDITABLE.map((f) => (
        <Field key={f.key} label={f.label} hint={changed.some((c) => c.key === f.key) ? 'Edited' : undefined}>
          <Input
            value={form[f.key] || ''}
            keyboardType={(f as any).kind ? 'number-pad' : 'default'}
            onChangeText={(v) => {
              setError(null);
              setForm((x) => ({
                ...x,
                [f.key]: (f as any).kind === 'phone' ? digits(v, 10) : (f as any).kind === 'pin' ? digits(v, 6) : v,
              }));
            }}
            multiline={f.key === 'permanentAddress'}
          />
        </Field>
      ))}
      {error && <ErrorBox message={error} />}
    </Sheet>
  );
};

// ── COMPONENT FOR ADDING ID DOCUMENT ──
const DocSheet = ({ open, onClose, studentId }: { open: boolean; onClose: () => void; studentId?: string }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [type, setType] = useState('AADHAAR');
  const [num, setNum] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType('AADHAAR');
      setNum('');
      setError(null);
    }
  }, [open]);

  const clean = num.replace(/\s/g, '').toUpperCase();
  const submit = async () => {
    if (type === 'AADHAAR' && !/^\d{12}$/.test(clean)) return setError('Aadhaar number must have exactly 12 digits.');
    if (type === 'PAN' && !/^[A-Z]{5}\d{4}[A-Z]$/.test(clean)) return setError('PAN number looks like ABCDE1234F.');
    if (type === 'PASSPORT' && !/^[A-Z]\d{7}$/.test(clean)) return setError('Passport number looks like A1234567.');

    setBusy(true);
    try {
      await studentsApi.uploadDocument(type, clean);
      toast.success('Submitted', 'The warden office will verify your ID document.');
      await qc.invalidateQueries({ queryKey: ['my-documents', studentId] });
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add ID Document"
      subtitle="Government identification for resident records"
      footer={
        <Button
          title="Submit ID Document"
          icon={Upload}
          onPress={submit}
          loading={busy}
          full
        />
      }
    >
      <Field label="Document Type">
        <Choices
          value={type}
          onChange={(v) => {
            setType(v);
            setError(null);
          }}
          columns={3}
          options={Object.entries(DOCUMENT_TYPES).map(([value, label]) => ({ value, label }))}
        />
      </Field>
      <Field label="Document Number" required>
        <Input
          value={num}
          onChangeText={(v) => {
            setNum(v.slice(0, 16));
            setError(null);
          }}
          autoCapitalize="characters"
          placeholder={type === 'AADHAAR' ? '12-digit Aadhaar' : type === 'PAN' ? '10-char PAN' : 'Passport number'}
        />
      </Field>
      {error && <ErrorBox message={error} />}
    </Sheet>
  );
};

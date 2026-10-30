import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BedDouble, Check, ChevronRight, Search, Snowflake, Users, X } from 'lucide-react-native';
import { roomsApi, studentsApi } from '../api';
import { asList } from '../api/client';
import { useData } from '../lib/query';
import { priceFor } from '../lib/hostel';
import { colors, radius, shadow } from '../ui/theme';
import { Avatar, Badge, Button, Chips, Press, Row, T } from '../ui/primitives';
import { Input, SearchInput } from '../ui/form';
import { Loading, useToast } from '../ui/feedback';
import { Sheet } from '../ui/Sheet';
import { rupees } from '../lib/format';

const bedsOf = (r: any) => r.sharingType || r.capacity || 0;
const freeBeds = (r: any) => (r.status === 'MAINTENANCE' ? 0 : Math.max(0, bedsOf(r) - (r.students?.length || 0)));

export default function AssignRoomSheet({
  open,
  onClose,
  student,
  room,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  student?: any | null;
  room?: any | null;
  onSuccess?: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();

  const studentsQuery = useData(['students'], studentsApi.all, { enabled: open && !student });
  const roomsQuery = useData(['rooms'], roomsApi.all, { enabled: open && !room });

  const allStudents = useMemo(() => asList(studentsQuery.data), [studentsQuery.data]);
  const allRooms = useMemo(() => asList(roomsQuery.data), [roomsQuery.data]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [studentQ, setStudentQ] = useState('');
  const [roomFloor, setRoomFloor] = useState<string>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedStudentId(student?.id || '');
    setSelectedRoomId(room?.id || student?.roomId || '');
    setStudentQ('');
    setRoomFloor('all');
    setBusy(false);
    setError(null);
  }, [open, student, room]);

  const activeStudent = useMemo(() => {
    if (student) return student;
    return allStudents.find((s: any) => s.id === selectedStudentId) || null;
  }, [student, allStudents, selectedStudentId]);

  const activeRoom = useMemo(() => {
    if (room) return room;
    return allRooms.find((r: any) => r.id === selectedRoomId) || null;
  }, [room, allRooms, selectedRoomId]);

  // Filter students: unallocated first, then by search
  const filteredStudents = useMemo(() => {
    const q = studentQ.trim().toLowerCase();
    return allStudents
      .filter((s: any) => {
        if (!q) return true;
        return [s.user?.name, s.rollNumber, s.room?.roomNumber, s.phoneNumber]
          .some((v) => v && String(v).toLowerCase().includes(q));
      })
      .sort((a: any, b: any) => {
        const aNo = !a.roomId;
        const bNo = !b.roomId;
        if (aNo && !bNo) return -1;
        if (!aNo && bNo) return 1;
        return String(a.user?.name || '').localeCompare(String(b.user?.name || ''));
      });
  }, [allStudents, studentQ]);

  // Floor numbers
  const floorList = useMemo(() => {
    const nums = new Set(allRooms.map((r: any) => r.floorNumber).filter(Boolean));
    return ['all', ...Array.from(nums).sort((a: any, b: any) => a - b).map(String)];
  }, [allRooms]);

  // Filter rooms with space or matching current student's room
  const availableRooms = useMemo(() => {
    return allRooms
      .filter((r: any) => (roomFloor === 'all' ? true : String(r.floorNumber) === roomFloor))
      .filter((r: any) => {
        if (r.id === activeStudent?.roomId) return true;
        return r.status !== 'MAINTENANCE' && freeBeds(r) > 0;
      })
      .sort((a: any, b: any) => (a.floorNumber - b.floorNumber) || String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }));
  }, [allRooms, roomFloor, activeStudent]);

  const handleAssign = async () => {
    if (!activeStudent) {
      setError('Please select a resident.');
      return;
    }

    if (selectedRoomId === (activeStudent.roomId || '')) {
      setError('Resident is already in this room.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await studentsApi.update(activeStudent.id, { roomId: selectedRoomId || null });
      if (selectedRoomId && activeRoom) {
        toast.success('Room assigned', `Room ${activeRoom.roomNumber} assigned to ${activeStudent.user?.name || 'Resident'}`);
      } else {
        toast.success('Room removed', `${activeStudent.user?.name || 'Resident'} is now unallocated`);
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: ['students'] }),
        qc.invalidateQueries({ queryKey: ['rooms'] }),
        qc.invalidateQueries({ queryKey: ['student', activeStudent.id] }),
        qc.invalidateQueries({ queryKey: ['gate-residents'] }),
      ]);

      onSuccess?.();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Could not assign room.');
    } finally {
      setBusy(false);
    }
  };

  const title = student
    ? `Assign room · ${student.user?.name}`
    : room
    ? `Assign to Room ${room.roomNumber}`
    : 'Assign room';

  const subtitle = student
    ? `Roll: ${student.rollNumber || '—'} · ${student.room ? `Current: Room ${student.room.roomNumber}` : 'No room yet'}`
    : room
    ? `Floor ${room.floorNumber} · ${freeBeds(room)} bed(s) free`
    : 'Allot resident to an available bed';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <Button
          title={
            busy
              ? 'Saving…'
              : !selectedRoomId && activeStudent?.roomId
              ? 'Remove from room'
              : activeStudent?.roomId && activeStudent.roomId !== selectedRoomId
              ? 'Change room'
              : 'Assign room'
          }
          icon={BedDouble}
          kind={!selectedRoomId && activeStudent?.roomId ? 'danger' : 'brand'}
          loading={busy}
          disabled={!activeStudent || (!selectedRoomId && !activeStudent?.roomId)}
          onPress={handleAssign}
          full
        />
      }
    >
      <View style={{ gap: 14 }}>
        {error && (
          <View style={styles.errorBanner}>
            <T v="small" c={colors.danger} w="semibold">{error}</T>
          </View>
        )}

        {/* 1. Student selection section */}
        {student ? (
          <View style={styles.cardHeader}>
            <Row gap={12}>
              <Avatar name={student.user?.name} uri={student.user?.avatar || student.profilePic} size={42} />
              <View style={{ flex: 1 }}>
                <T v="title" w="bold">{student.user?.name}</T>
                <T v="caption" c={colors.text3}>{student.rollNumber} {student.phoneNumber ? `· ${student.phoneNumber}` : ''}</T>
              </View>
              <Badge
                label={student.room ? `Room ${student.room.roomNumber}` : 'No room'}
                tone={student.room ? 'mint' : 'warning'}
              />
            </Row>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <T v="small" w="bold">1. Select resident</T>
            <SearchInput value={studentQ} onChange={setStudentQ} placeholder="Search student name or roll number" />
            {studentsQuery.isLoading ? (
              <Loading rows={2} h={50} />
            ) : (
              <View style={{ gap: 6, maxHeight: 180 }}>
                {filteredStudents.slice(0, 15).map((s: any) => {
                  const sel = s.id === selectedStudentId;
                  return (
                    <Press
                      key={s.id}
                      onPress={() => { setSelectedStudentId(s.id); setError(null); }}
                      scaleTo={0.97}
                      style={[styles.itemCard, sel && styles.itemCardSelected]}
                    >
                      <Row gap={10} style={{ flex: 1 }}>
                        <Avatar name={s.user?.name} uri={s.user?.avatar || s.profilePic} size={34} />
                        <View style={{ flex: 1 }}>
                          <T v="small" w="semibold" numberOfLines={1}>{s.user?.name}</T>
                          <T v="caption" c={colors.text3}>{s.rollNumber || 'No roll'}</T>
                        </View>
                        <Badge
                          label={s.room ? `Room ${s.room.roomNumber}` : 'No room'}
                          tone={s.room ? 'white' : 'warning'}
                        />
                      </Row>
                      {sel && <Check size={18} color={colors.brand700} />}
                    </Press>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <T v="caption" c={colors.text3} center style={{ paddingVertical: 10 }}>No students found</T>
                )}
              </View>
            )}
          </View>
        )}

        {/* 2. Room selection section */}
        {room ? (
          <View style={styles.cardHeader}>
            <Row gap={12}>
              <View style={styles.roomBadge}>
                <T v="caption" c={colors.text3}>ROOM</T>
                <T v="title" w="bold">{room.roomNumber}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T v="title" w="bold">Floor {room.floorNumber} · {priceFor(room.sharingType).label}</T>
                <T v="caption" c={colors.text3}>
                  {room.isAc ? 'AC · ' : ''}₹{priceFor(room.sharingType).total.toLocaleString('en-IN')}/mo
                </T>
              </View>
              <Badge label={`${freeBeds(room)} free`} tone="success" />
            </Row>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <T v="small" w="bold">2. Select room</T>
            {floorList.length > 2 && (
              <Chips
                value={roomFloor}
                onChange={setRoomFloor}
                options={floorList.map((f) => ({ value: f, label: f === 'all' ? 'All floors' : `Floor ${f}` }))}
              />
            )}

            {roomsQuery.isLoading ? (
              <Loading rows={3} h={60} />
            ) : (
              <View style={{ gap: 6 }}>
                {/* Option to unassign if student currently has a room */}
                {activeStudent?.roomId ? (
                  <Press
                    onPress={() => { setSelectedRoomId(''); setError(null); }}
                    scaleTo={0.97}
                    style={[styles.itemCard, selectedRoomId === '' && styles.itemCardDanger]}
                  >
                    <Row gap={10} style={{ flex: 1 }}>
                      <View style={[styles.roomBadge, { backgroundColor: colors.peach50 }]}>
                        <X size={16} color={colors.danger} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <T v="small" w="semibold" c={colors.danger}>Remove from room</T>
                        <T v="caption" c={colors.text3}>Move resident out and leave unallocated</T>
                      </View>
                    </Row>
                    {selectedRoomId === '' && <Check size={18} color={colors.danger} />}
                  </Press>
                ) : null}

                {availableRooms.map((r: any) => {
                  const sel = r.id === selectedRoomId;
                  const isCurrent = activeStudent?.roomId && activeStudent.roomId === r.id;
                  const free = freeBeds(r);
                  const price = priceFor(r.sharingType);
                  return (
                    <Press
                      key={r.id}
                      onPress={() => { setSelectedRoomId(r.id); setError(null); }}
                      scaleTo={0.97}
                      style={[styles.itemCard, sel && styles.itemCardSelected]}
                    >
                      <Row gap={10} style={{ flex: 1 }}>
                        <View style={styles.roomBadge}>
                          <T v="caption" c={colors.text3}>ROOM</T>
                          <T v="small" w="bold">{r.roomNumber}</T>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Row gap={6}>
                            <T v="small" w="semibold">Floor {r.floorNumber} · {price.label}</T>
                            {r.isAc ? <Badge label="AC" tone="mint" icon={Snowflake} /> : null}
                          </Row>
                          <T v="caption" c={colors.text3}>₹{price.total.toLocaleString('en-IN')}/mo</T>
                        </View>
                        <Badge
                          label={isCurrent ? 'Current' : `${free} bed${free > 1 ? 's' : ''} free`}
                          tone={isCurrent ? 'mint' : 'success'}
                        />
                      </Row>
                      {sel && <Check size={18} color={colors.brand700} />}
                    </Press>
                  );
                })}
                {availableRooms.length === 0 && (
                  <T v="caption" c={colors.text3} center style={{ paddingVertical: 14 }}>
                    No available rooms on this floor
                  </T>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    backgroundColor: colors.mint50,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.mint200,
    padding: 12,
  },
  roomBadge: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint100,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 8,
  },
  itemCardSelected: {
    backgroundColor: colors.mint50,
    borderColor: colors.brand600,
  },
  itemCardDanger: {
    backgroundColor: colors.peach50,
    borderColor: colors.danger,
  },
  errorBanner: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.input,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f5c9c6',
  },
});


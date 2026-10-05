// CSV exports shared by Rooms, Floor Directory and Reports.
// Each function downloads a file and returns the number of rows written.
import {
  students as studentsApi, rooms as roomsApi, leaves as leavesApi, visitors as visitorsApi,
  complaints as complaintsApi, fees as feesApi, floors as floorsApi,
} from './api';
import { downloadCsv } from './format';
import { COMPLAINT_STATUS, LEAVE_STATUS, LEAVE_TYPES, STUDENT_STATUS, priceFor } from '../config/hostel';

const d = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const dt = (v) => (v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
const inMonth = (v, month) => v && String(new Date(v).getFullYear()) + '-' + String(new Date(v).getMonth() + 1).padStart(2, '0') === month;
const onFloor = (room, floor) => !floor || floor === 'all' || String(room?.floorNumber) === String(floor);
const suffix = (floor) => (floor && floor !== 'all' ? `-floor-${floor}` : '');
const stamp = () => new Date().toISOString().slice(0, 10);
const write = (name, header, rows) => {
  if (rows.length) downloadCsv(name, header, rows);
  return rows.length;
};
const listOf = (res) => (Array.isArray(res) ? res : res?.data || res?.rooms || []);
const byRoom = (a, b) => (a.floorNumber || 0) - (b.floorNumber || 0) || String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true });

// ── Rooms & beds ──
export const exportRooms = async (rooms, floor = 'all') => {
  const list = rooms || listOf(await roomsApi.getAll());
  const rows = list
    .filter((r) => onFloor(r, floor))
    .sort(byRoom)
    .map((r) => {
      const beds = r.sharingType || r.capacity || 0;
      const occupants = r.students || [];
      return [
        r.floorNumber, r.roomNumber, priceFor(r.sharingType).label, r.isAc ? 'AC' : 'Non-AC', r.status, beds, occupants.length,
        r.status === 'MAINTENANCE' ? 0 : Math.max(0, beds - occupants.length), priceFor(r.sharingType).total,
        occupants.map((s) => s.user?.name || s.name).filter(Boolean).join('; '),
      ];
    });
  return write(`rooms-and-beds${suffix(floor)}-${stamp()}.csv`,
    ['Floor', 'Room', 'Sharing', 'AC', 'Status', 'Beds', 'Occupied', 'Free beds', 'Fee per bed (₹)', 'Residents'], rows);
};

// Only the empty beds — handy when a new admission walks in
export const exportFreeBeds = async (rooms, floor = 'all') => {
  const list = rooms || listOf(await roomsApi.getAll());
  const rows = list
    .filter((r) => onFloor(r, floor) && r.status !== 'MAINTENANCE')
    .sort(byRoom)
    .flatMap((r) => {
      const free = Math.max(0, (r.sharingType || r.capacity || 0) - (r.students?.length || 0));
      return free ? [[r.floorNumber, r.roomNumber, priceFor(r.sharingType).label, r.isAc ? 'AC' : 'Non-AC', free, priceFor(r.sharingType).total]] : [];
    });
  return write(`free-beds${suffix(floor)}-${stamp()}.csv`, ['Floor', 'Room', 'Sharing', 'AC', 'Free beds', 'Fee per bed (₹)'], rows);
};

// ── Residents ──
export const exportResidents = async (students, floor = 'all') => {
  const list = students || listOf(await studentsApi.getAll());
  const rows = list
    .filter((s) => onFloor(s.room, floor))
    .sort((a, b) => byRoom(a.room || {}, b.room || {}) || String(a.user?.name).localeCompare(String(b.user?.name)))
    .map((s) => [
      s.user?.name, s.rollNumber, s.room?.floorNumber || '', s.room?.roomNumber || 'Not allotted', s.bedId || '', STUDENT_STATUS[s.status]?.label || s.status,
      s.phoneNumber, s.user?.email, s.fatherName, s.parentContact, s.motherName, s.motherContact, s.emergencyContact, s.bloodGroup,
      s.coachingCollege, s.permanentAddress, s.state, d(s.dateOfJoining),
    ]);
  return write(`residents${suffix(floor)}-${stamp()}.csv`,
    ['Name', 'Roll no.', 'Floor', 'Room', 'Bed', 'Status', 'Phone', 'Email', "Father's name", 'Parent phone', "Mother's name", 'Mother phone',
      'Emergency contact', 'Blood group', 'Company / college', 'Address', 'State', 'Joined on'], rows);
};

// Residents of one floor from the Floor Directory payload ({ rooms: [{ roomNumber, students }] })
export const exportFloorResidents = (detail) => {
  const rows = (detail?.rooms || []).flatMap((room) => room.students.map((s) => [
    room.roomNumber, room.sharingLabel, s.bedId || '', s.name, s.rollNumber, s.phoneNumber, s.fatherName, s.parentContact, s.coachingCollege, d(s.dateOfJoining),
  ]));
  return write(`floor-${detail?.floor?.floorNumber}-residents-${stamp()}.csv`,
    ['Room', 'Sharing', 'Bed', 'Name', 'Roll no.', 'Phone', "Father's name", 'Parent phone', 'Company / college', 'Joined on'], rows);
};

// Floor summary from the floors list
export const exportFloorSummary = async (floors) => {
  const list = floors || (await floorsApi.getAll());
  const rows = list.map((f) => [
    f.floorNumber, f.companyName, f.hostelName, f.stats?.totalRooms, f.stats?.totalBeds, f.stats?.totalStudents, f.stats?.freeBeds, f.stats?.maintenanceRooms, `${f.stats?.occupancyPct ?? 0}%`,
  ]);
  return write(`floor-summary-${stamp()}.csv`, ['Floor', 'Company', 'Hostel', 'Rooms', 'Beds', 'Residents', 'Free beds', 'Rooms under repair', 'Occupancy'], rows);
};

// ── Leaves & gate ──
export const exportLeaves = async (month, floor = 'all') => {
  const list = listOf(await leavesApi.getAll());
  const rows = list
    .filter((l) => (inMonth(l.startDate, month) || inMonth(l.createdAt, month)) && onFloor(l.student?.room, floor))
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .map((l) => {
      const late = l.checkinTime && l.endDate && new Date(l.checkinTime) > new Date(l.endDate);
      return [
        l.student?.user?.name, l.student?.rollNumber, l.student?.room?.roomNumber, LEAVE_TYPES[l.type] || l.type, l.reason, l.destination,
        dt(l.startDate), dt(l.endDate), LEAVE_STATUS[l.status]?.short || l.status, dt(l.checkoutTime), dt(l.checkinTime), late ? 'Yes' : '', l.comments, dt(l.createdAt),
      ];
    });
  return write(`leaves-${month}${suffix(floor)}.csv`,
    ['Resident', 'Roll no.', 'Room', 'Type', 'Reason', 'Destination', 'From', 'To', 'Status', 'Left at', 'Returned at', 'Late return', 'Warden note', 'Applied on'], rows);
};

export const exportVisitors = async (month, floor = 'all') => {
  const list = listOf(await visitorsApi.getAll());
  const rows = list
    .filter((v) => inMonth(v.checkInTime, month) && onFloor(v.student?.room, floor))
    .sort((a, b) => new Date(a.checkInTime) - new Date(b.checkInTime))
    .map((v) => [v.name, v.relationship, v.phone, v.student?.user?.name, v.student?.rollNumber, v.student?.room?.roomNumber, dt(v.checkInTime), dt(v.checkOutTime) || 'Still inside']);
  return write(`visitors-${month}${suffix(floor)}.csv`, ['Visitor', 'Relation', 'Phone', 'Visiting', 'Roll no.', 'Room', 'In', 'Out'], rows);
};

// ── Helpdesk ──
export const exportComplaints = async (month, floor = 'all') => {
  const list = listOf(await complaintsApi.getAll());
  const rows = list
    .filter((c) => inMonth(c.createdAt, month) && onFloor(c.student?.room, floor))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((c) => [dt(c.createdAt), c.category, c.priority, COMPLAINT_STATUS[c.status]?.label || c.status, c.description, c.location, c.student?.user?.name, c.student?.rollNumber, c.student?.room?.roomNumber, c.wardenNotes]);
  return write(`complaints-${month}${suffix(floor)}.csv`, ['Raised on', 'Category', 'Priority', 'Status', 'Problem', 'Location', 'Resident', 'Roll no.', 'Room', 'Warden note'], rows);
};

// ── Mess (from the report summary) ──
export const exportMess = (summary) => {
  const rows = (summary?.mess?.days || []).map((x) => [x.date, x.BREAKFAST, x.LUNCH, x.SNACKS, x.DINNER, x.BREAKFAST + x.LUNCH + x.SNACKS + x.DINNER, x.optOuts]);
  return write(`mess-attendance-${summary?.month}${suffix(summary?.floorNumber)}.csv`, ['Date', 'Breakfast', 'Lunch', 'Snacks', 'Dinner', 'Total plates', 'Meals skipped'], rows);
};

// ── Fees ──
export const exportInvoices = async (month, floor = 'all') => {
  const list = listOf(await feesApi.getAll());
  const rows = list
    .filter((i) => inMonth(i.createdAt, month) && onFloor(i.student?.room, floor))
    .map((i) => [
      i.student?.user?.name, i.student?.rollNumber, i.student?.room?.roomNumber, i.student?.room?.floorNumber, i.rentAmount ?? '', i.messAmount ?? '', i.electricityAmount ?? '',
      i.amount, d(i.dueDate), i.status === 'PAID' ? 'Paid' : 'Unpaid', d(i.paidAt),
    ]);
  return write(`invoices-${month}${suffix(floor)}.csv`, ['Resident', 'Roll no.', 'Room', 'Floor', 'Rent', 'Mess', 'Electricity', 'Total', 'Due date', 'Status', 'Paid on'], rows);
};

export const exportCollection = async (month, floor = 'all') => {
  if (floor === 'all') {
    const r = await floorsApi.getReport('combined', month);
    const rows = (r.floors || []).map((f) => [f.floor.floorNumber, f.floor.companyName, f.summary.totalStudents, f.summary.totalHostelFee, f.summary.totalMessFee, f.summary.totalElectricity, f.summary.grandTotal, f.summary.totalCollected, f.summary.totalPending, `${f.summary.collectionRate}%`]);
    return write(`fee-collection-${month}.csv`, ['Floor', 'Company', 'Residents', 'Rent', 'Mess', 'Electricity', 'Billed', 'Collected', 'Pending', 'Collection %'], rows);
  }
  const r = await floorsApi.getReport(floor, month);
  const rows = (r.students || []).map((s) => [s.name, s.rollNumber, s.roomNumber, s.sharingType, s.hostelFee, s.messFee, s.electricity, s.total, s.paid, s.pending, s.status]);
  return write(`fee-collection-${month}-floor-${floor}.csv`, ['Resident', 'Roll no.', 'Room', 'Sharing', 'Rent', 'Mess', 'Electricity', 'Total', 'Paid', 'Pending', 'Status'], rows);
};

const { sendMail } = require('./mail');

/**
 * Send WhatsApp + Email notifications to student's parent
 */
const notifyParentLeaveEvent = async ({ eventType, student, leave }) => {
  if (!student) return;

  const studentName = student.user?.name || 'Student';
  const parentContact = student.parentContact || 'N/A';
  const parentEmail = student.user?.email || 'parent@example.com';
  const roomInfo = student.room ? `Room ${student.room.roomNumber} (Floor ${student.room.floorNumber})` : 'Hari Pushp PG';

  const startDateStr = leave.startDate ? new Date(leave.startDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';
  const endDateStr = leave.endDate ? new Date(leave.endDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';

  let subject = '';
  let messageText = '';

  if (eventType === 'LEAVE_APPROVED') {
    subject = `✅ Leave Approved - ${studentName} (${roomInfo})`;
    messageText = `Dear Parent,\n\nThe leave request for your daughter ${studentName} (${roomInfo}) has been APPROVED by the warden.\n\nLeave Details:\n- Type: ${leave.type || 'Leave'}\n- Departure Date: ${startDateStr}\n- Expected Return: ${endDateStr}\n- Reason: ${leave.reason || 'N/A'}\n\nPlease ensure she returns to the hostel by 8:00 PM on the specified date.\n\nRegards,\nHari Pushp Girls Hostel Management`;
  } else if (eventType === 'STUDENT_DEPARTED') {
    subject = `🚪 Departure Notification - ${studentName} (${roomInfo})`;
    messageText = `Dear Parent,\n\nThis is to inform you that your daughter ${studentName} (${roomInfo}) has DEPARTED from Hari Pushp PG Hostel at ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.\n\nLeave Period: ${startDateStr} to ${endDateStr}\n\nRegards,\nHari Pushp Girls Hostel Security & Management`;
  }

  // 1. Send Email Notification
  try {
    await sendMail({
      to: parentEmail,
      subject,
      text: messageText,
    });
  } catch (err) {
    console.error(`[Parent Email Notification Error - ${eventType}]:`, err.message);
  }

  // 2. Simulated / API WhatsApp Notification Dispatch
  console.log(`\n📲 [WHATSAPP NOTIFICATION SENT TO PARENT] (${parentContact}):`);
  console.log(`To Parent: ${parentContact}`);
  console.log(`Message:\n${messageText}`);
  console.log('------------------------------------------------------------\n');
};

module.exports = {
  notifyParentLeaveEvent,
};

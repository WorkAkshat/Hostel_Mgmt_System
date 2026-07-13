const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Determine meal type dynamically based on current time
const getMealTypeByTime = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10) return 'BREAKFAST';
  if (hour >= 11 && hour < 15) return 'LUNCH';
  if (hour >= 16 && hour < 18) return 'SNACKS';
  return 'DINNER'; // Default or night meal
};

// @desc    Biometric Mess dining check-in simulation
// @route   POST /api/mess/biometric-verify
// @access  Public
const biometricVerifyMess = async (req, res) => {
  const { rollNumber, mealType, method } = req.body;

  if (!rollNumber) {
    return res.status(400).json({ message: 'Roll number is required for biometric check-in' });
  }

  const selectedMeal = mealType ? mealType.toUpperCase() : getMealTypeByTime();
  const dateStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

  try {
    // 1. Verify Student exists
    const student = await prisma.student.findUnique({
      where: { rollNumber },
      include: { user: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Biometric template not found: Student roll number is not registered.' });
    }

    // 2. Check if student already checked-in for this meal today
    const alreadyAte = await prisma.messAttendance.findFirst({
      where: {
        studentId: student.id,
        mealType: selectedMeal,
        date: dateStr
      }
    });

    if (alreadyAte) {
      return res.status(400).json({ 
        message: `Biometric Verification Denied: Student has already checked-in for ${selectedMeal} today on ${dateStr}.`
      });
    }

    // 3. Log entry
    const entry = await prisma.messAttendance.create({
      data: {
        studentId: student.id,
        mealType: selectedMeal,
        date: dateStr,
        verifiedBy: method || 'BIOMETRIC_FINGERPRINT'
      }
    });

    res.status(201).json({
      success: true,
      studentName: student.user.name,
      mealType: selectedMeal,
      timestamp: entry.timestamp,
      message: `Biometric Access Approved for ${selectedMeal} on ${dateStr}. Enjoy your meal!`
    });
  } catch (error) {
    console.error('Mess biometric error:', error);
    res.status(500).json({ message: 'Server error registering dining check-in' });
  }
};

// @desc    Get dining statistics (Warden only)
// @route   GET /api/mess/stats
// @access  Private (Admin only)
const getMessStats = async (req, res) => {
  try {
    // Total registered students
    const totalStudentsCount = await prisma.student.count();

    // Get today's logs
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = await prisma.messAttendance.findMany({
      where: { date: todayStr }
    });

    // Breakdown today's meals
    const todayStats = {
      BREAKFAST: todayLogs.filter(l => l.mealType === 'BREAKFAST').length,
      LUNCH: todayLogs.filter(l => l.mealType === 'LUNCH').length,
      SNACKS: todayLogs.filter(l => l.mealType === 'SNACKS').length,
      DINNER: todayLogs.filter(l => l.mealType === 'DINNER').length
    };

    const mealStatsChartData = Object.keys(todayStats).map(meal => ({
      name: meal.charAt(0) + meal.slice(1).toLowerCase(),
      Attended: todayStats[meal],
      Capacity: totalStudentsCount
    }));

    // Historical average (past 7 days summary)
    const history = await prisma.messAttendance.findMany({
      orderBy: { date: 'asc' }
    });

    // Group logs by date
    const groupedHistory = history.reduce((acc, log) => {
      const date = log.date;
      if (!acc[date]) acc[date] = 0;
      acc[date] += 1;
      return acc;
    }, {});

    const historyChartData = Object.keys(groupedHistory).map(date => ({
      date: date.substring(5), // "MM-DD"
      Attendance: groupedHistory[date]
    })).slice(-7); // Last 7 days

    res.json({
      todayStats,
      totalStudentsCount,
      mealStatsChartData,
      historyChartData
    });
  } catch (error) {
    console.error('Error fetching mess stats:', error);
    res.status(500).json({ message: 'Server error generating dining metrics' });
  }
};

// @desc    Get logged in student's dining logs
// @route   GET /api/mess/my-attendance
// @access  Private
const getMyMessAttendance = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const logs = await prisma.messAttendance.findMany({
      where: { studentId: student.id },
      orderBy: { timestamp: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching student dining logs:', error);
    res.status(500).json({ message: 'Server error retrieving dining logs' });
  }
};

module.exports = {
  biometricVerifyMess,
  getMessStats,
  getMyMessAttendance
};

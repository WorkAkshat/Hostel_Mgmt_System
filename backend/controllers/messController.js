const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const MENU_FILE_PATH = path.join(__dirname, '../mess_menu.json');

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

// @desc    Student Opt-out of a meal
// @route   POST /api/mess/opt-out
// @access  Private (Student)
const optOutMeal = async (req, res) => {
  try {
    const { date, mealType } = req.body;

    if (!mealType) {
      return res.status(400).json({ message: 'Meal type is required' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    const optOut = await prisma.mealOptOut.create({
      data: {
        studentId: student.id,
        date: targetDate,
        mealType: mealType.toUpperCase()
      }
    });

    res.status(201).json({
      message: `Successfully opted out of ${mealType} for ${targetDate}`,
      optOut
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'You have already opted out of this meal for today.' });
    }
    console.error('Error opting out of meal:', error);
    res.status(500).json({ message: 'Server error saving meal opt-out' });
  }
};

// @desc    Cancel student meal opt-out (Re-enroll for meal)
// @route   DELETE /api/mess/opt-out/:id
// @access  Private (Student)
const cancelOptOut = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.mealOptOut.delete({
      where: { id }
    });

    res.json({ message: 'Meal opt-out cancelled successfully. Re-enrolled for meal.' });
  } catch (error) {
    console.error('Error cancelling meal opt-out:', error);
    res.status(500).json({ message: 'Server error cancelling meal opt-out' });
  }
};

// @desc    Cook Dashboard metrics (Expected meal count = Total residents - Opt outs)
// @route   GET /api/mess/cook-dashboard
// @access  Private
const getCookDashboard = async (req, res) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const totalStudents = await prisma.student.count({ where: { status: 'CHECKED_IN' } });

    const optOuts = await prisma.mealOptOut.findMany({
      where: { date: targetDate },
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            room: true
          }
        }
      }
    });

    const optOutCounts = {
      BREAKFAST: optOuts.filter(o => o.mealType === 'BREAKFAST').length,
      LUNCH: optOuts.filter(o => o.mealType === 'LUNCH').length,
      SNACKS: optOuts.filter(o => o.mealType === 'SNACKS').length,
      DINNER: optOuts.filter(o => o.mealType === 'DINNER').length,
    };

    const expectedMealCounts = {
      BREAKFAST: Math.max(0, totalStudents - optOutCounts.BREAKFAST),
      LUNCH: Math.max(0, totalStudents - optOutCounts.LUNCH),
      SNACKS: Math.max(0, totalStudents - optOutCounts.SNACKS),
      DINNER: Math.max(0, totalStudents - optOutCounts.DINNER),
    };

    res.json({
      date: targetDate,
      totalEnrolledResidents: totalStudents,
      optOutCounts,
      expectedMealCounts,
      optOutsList: optOuts
    });
  } catch (error) {
    console.error('Error fetching cook dashboard:', error);
    res.status(500).json({ message: 'Server error loading cook dashboard metrics' });
  }
};

const DEFAULT_MENU = {
  Monday:    { breakfast: 'Poha + Chai', lunch: 'Dal Tadka + Roti + Rice', snacks: 'Samosa + Tea', dinner: 'Paneer Butter Masala + Naan' },
  Tuesday:   { breakfast: 'Idli + Sambar', lunch: 'Rajma Chawal + Salad', snacks: 'Biscuits + Chai', dinner: 'Aloo Gobi + Roti + Dal' },
  Wednesday: { breakfast: 'Paratha + Curd', lunch: 'Chana Masala + Rice + Roti', snacks: 'Pakoda + Tea', dinner: 'Mix Veg + Phulka + Rice' },
  Thursday:  { breakfast: 'Upma + Chutney', lunch: 'Dal Makhani + Jeera Rice', snacks: 'Bread Pakoda + Tea', dinner: 'Shahi Paneer + Laccha Paratha' },
  Friday:    { breakfast: 'Puri + Bhaji', lunch: 'Chole + Rice + Roti', snacks: 'Chakli + Tea', dinner: 'Dal Tadka + Roti + Rice' },
  Saturday:  { breakfast: 'Aloo Paratha + Pickle', lunch: 'Veg Biryani + Raita', snacks: 'Popcorn + Chai', dinner: 'Kadhi Pakoda + Rice + Roti' },
  Sunday:    { breakfast: 'Dosa + Chutney + Sambar', lunch: 'Special Thali (Puri, Dal, Sabzi, Sweet)', snacks: 'French Fries + Sauce', dinner: 'Veg Pulao + Butter Naan + Raita' },
};

const getMessMenu = async (req, res) => {
  try {
    if (!fs.existsSync(MENU_FILE_PATH)) {
      fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(DEFAULT_MENU, null, 2));
      return res.json(DEFAULT_MENU);
    }
    const data = fs.readFileSync(MENU_FILE_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error fetching mess menu:', error);
    res.status(500).json({ message: 'Server error retrieving mess menu' });
  }
};

const updateMessMenu = async (req, res) => {
  try {
    const newMenu = req.body;
    if (!newMenu || typeof newMenu !== 'object') {
      return res.status(400).json({ message: 'Invalid menu data provided' });
    }
    fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(newMenu, null, 2));
    res.json({ message: 'Mess menu updated successfully', menu: newMenu });
  } catch (error) {
    console.error('Error updating mess menu:', error);
    res.status(500).json({ message: 'Server error saving mess menu' });
  }
};

module.exports = {
  biometricVerifyMess,
  getMessStats,
  getMyMessAttendance,
  optOutMeal,
  cancelOptOut,
  getCookDashboard,
  getMessMenu,
  updateMessMenu
};

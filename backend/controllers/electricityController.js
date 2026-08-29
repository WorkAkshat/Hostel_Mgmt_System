const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Submit sub-meter electricity reading for a room
// @route   POST /api/v1/electricity/readings
// @access  Private (Admin / Warden)
const submitReading = async (req, res) => {
  try {
    const { roomId, readingMonth, readingDate, previousReading, currentReading, ratePerUnit = 8.0 } = req.body;

    if (!roomId || !readingMonth || previousReading === undefined || currentReading === undefined) {
      return res.status(400).json({ message: 'Please provide roomId, readingMonth, previousReading, and currentReading.' });
    }

    const prev = parseFloat(previousReading);
    const curr = parseFloat(currentReading);

    if (curr < prev) {
      return res.status(400).json({ message: 'Current reading cannot be less than previous reading.' });
    }

    const unitsConsumed = curr - prev;
    const rate = parseFloat(ratePerUnit);
    const totalAmount = Math.round(unitsConsumed * rate);

    const reading = await prisma.electricityReading.upsert({
      where: {
        roomId_readingMonth: { roomId, readingMonth }
      },
      update: {
        readingDate: readingDate ? new Date(readingDate) : new Date(),
        previousReading: prev,
        currentReading: curr,
        unitsConsumed,
        ratePerUnit: rate,
        totalAmount,
        enteredBy: req.user.name || 'Warden'
      },
      create: {
        roomId,
        readingMonth,
        readingDate: readingDate ? new Date(readingDate) : new Date(),
        previousReading: prev,
        currentReading: curr,
        unitsConsumed,
        ratePerUnit: rate,
        totalAmount,
        enteredBy: req.user.name || 'Warden'
      }
    });

    res.status(201).json({
      message: 'Electricity reading recorded successfully',
      reading
    });
  } catch (error) {
    console.error('Error submitting electricity reading:', error);
    res.status(500).json({ message: 'Server error saving electricity reading' });
  }
};

// @desc    Get electricity readings for a month / floor
// @route   GET /api/v1/electricity/readings
// @access  Private
const getReadings = async (req, res) => {
  try {
    const { month, floorNumber } = req.query;

    const where = {};
    if (month) where.readingMonth = month;
    if (floorNumber) where.room = { floorNumber: parseInt(floorNumber, 10) };

    const readings = await prisma.electricityReading.findMany({
      where,
      include: {
        room: {
          include: {
            students: {
              select: { id: true, rollNumber: true, user: { select: { name: true } } }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(readings);
  } catch (error) {
    console.error('Error fetching electricity readings:', error);
    res.status(500).json({ message: 'Server error fetching electricity readings' });
  }
};

module.exports = {
  submitReading,
  getReadings
};

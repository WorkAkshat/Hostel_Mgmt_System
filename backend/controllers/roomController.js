const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Private
const getAllRooms = async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        students: {
          select: {
            id: true,
            rollNumber: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: 'Server error fetching rooms' });
  }
};

// @desc    Get room by ID
// @route   GET /api/rooms/:id
// @access  Private
const getRoomById = async (req, res) => {
  const { id } = req.params;

  try {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        students: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ message: 'Server error fetching room' });
  }
};

// @desc    Create new room
// @route   POST /api/rooms
// @access  Private (Admin/Warden only)
const createRoom = async (req, res) => {
  const { roomNumber, block, sharingType, isAc, assets } = req.body;

  if (!roomNumber || !block || !sharingType) {
    return res.status(400).json({ message: 'Room number, block, and sharing type are required' });
  }

  try {
    const roomExists = await prisma.room.findUnique({ where: { roomNumber } });
    if (roomExists) {
      return res.status(400).json({ message: 'Room with this number already exists' });
    }

    // Default assets list if not provided
    const defaultAssets = JSON.stringify([
      { name: 'Bed', status: 'Good' },
      { name: 'Study Table', status: 'Good' },
      { name: 'Chair', status: 'Good' },
      { name: 'Ceiling Fan', status: 'Good' },
      { name: 'LAN Port', status: 'Working' },
    ]);

    const newRoom = await prisma.room.create({
      data: {
        roomNumber,
        block,
        sharingType: parseInt(sharingType, 10),
        isAc: !!isAc,
        status: 'AVAILABLE',
        assets: assets ? JSON.stringify(assets) : defaultAssets
      }
    });

    res.status(201).json(newRoom);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ message: 'Server error creating room' });
  }
};

// @desc    Update room details (Warden only)
// @route   PUT /api/rooms/:id
// @access  Private (Admin/Warden only)
const updateRoom = async (req, res) => {
  const { id } = req.params;
  const { roomNumber, block, sharingType, isAc, status, assets } = req.body;

  try {
    const room = await prisma.room.findUnique({
      where: { id },
      include: { students: true }
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Determine target occupancy status
    let updatedStatus = status || room.status;

    if (sharingType && room.students.length >= parseInt(sharingType, 10)) {
      updatedStatus = 'FULL';
    } else if (sharingType && room.students.length < parseInt(sharingType, 10)) {
      updatedStatus = 'AVAILABLE';
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        roomNumber: roomNumber || room.roomNumber,
        block: block || room.block,
        sharingType: sharingType ? parseInt(sharingType, 10) : room.sharingType,
        isAc: isAc !== undefined ? !!isAc : room.isAc,
        status: updatedStatus,
        assets: assets ? JSON.stringify(assets) : room.assets
      }
    });

    res.json(updatedRoom);
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ message: 'Server error updating room' });
  }
};

// @desc    Delete room (Warden only)
// @route   DELETE /api/rooms/:id
// @access  Private (Admin/Warden only)
const deleteRoom = async (req, res) => {
  const { id } = req.params;

  try {
    const room = await prisma.room.findUnique({
      where: { id },
      include: { students: true }
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Prevent deleting a room that has active students assigned
    if (room.students.length > 0) {
      return res.status(400).json({ message: 'Cannot delete a room while students are still assigned to it' });
    }

    await prisma.room.delete({ where: { id } });
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ message: 'Server error deleting room' });
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom
};

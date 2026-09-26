const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/activityLogger');

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Private
const getAllRooms = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const cursor = req.query.cursor;

    const queryOptions = {
      include: {
        students: {
          select: {
            id: true,
            rollNumber: true,
            bedId: true,
            status: true,
            phoneNumber: true,
            profilePic: true,
            user: {
              select: {
                name: true,
                avatar: true
              }
            }
          }
        }
      },
      orderBy: { roomNumber: 'asc' }
    };

    if (limit !== null) {
      queryOptions.take = limit + 1;
      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1;
      }
    }

    const rooms = await prisma.room.findMany(queryOptions);

    if (limit !== null) {
      let nextCursor = null;
      let hasMore = false;
      if (rooms.length > limit) {
        hasMore = true;
        nextCursor = rooms[limit - 1].id;
        rooms.pop();
      }
      return res.json({
        data: rooms,
        nextCursor,
        hasMore
      });
    }

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
// Bed labels like ["101-A", "101-B"] for a room
const bedLabels = (roomNumber, count) =>
  Array.from({ length: count }, (_, i) => `${roomNumber}-${String.fromCharCode(65 + i)}`);

const createRoom = async (req, res) => {
  const { roomNumber, block, sharingType, isAc, assets, floorNumber } = req.body;

  if (!roomNumber || !sharingType) {
    return res.status(400).json({ message: 'Room number and sharing type are required' });
  }

  const beds = parseInt(sharingType, 10);
  if (![1, 2, 3].includes(beds)) {
    return res.status(400).json({ message: 'Sharing type must be 1, 2 or 3' });
  }

  try {
    const roomExists = await prisma.room.findUnique({ where: { roomNumber } });
    if (roomExists) {
      return res.status(400).json({ message: 'Room with this number already exists' });
    }

    // Link the room to its floor (falls back to the first digit of the room number)
    const floorNum = parseInt(floorNumber, 10) || parseInt(String(roomNumber).replace(/\D/g, '').charAt(0), 10) || 1;
    const floor = await prisma.floor.findUnique({ where: { floorNumber: floorNum } });

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
        block: block || floor?.hostelName || 'Hari Pushp',
        floorNumber: floorNum,
        floorId: floor?.id || null,
        sharingType: beds,
        capacity: beds,
        isAc: !!isAc,
        status: 'AVAILABLE',
        bedMapping: JSON.stringify(bedLabels(roomNumber, beds)),
        assets: assets ? JSON.stringify(assets) : defaultAssets
      }
    });

    res.status(201).json(newRoom);

    logActivity({ req, action: 'CREATE', module: 'ROOM', description: `Created room ${roomNumber} (Floor ${floorNum}, ${beds}-sharing)`, targetId: newRoom.id, targetType: 'Room' });
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
  const { roomNumber, block, sharingType, isAc, status, assets, floorNumber } = req.body;

  try {
    const room = await prisma.room.findUnique({
      where: { id },
      include: { students: true }
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const beds = sharingType ? parseInt(sharingType, 10) : room.sharingType;
    if (sharingType && room.students.length > beds) {
      return res.status(400).json({ message: `This room has ${room.students.length} residents. Move someone out before reducing it to ${beds} bed(s).` });
    }

    if (roomNumber && roomNumber !== room.roomNumber) {
      const taken = await prisma.room.findUnique({ where: { roomNumber } });
      if (taken) return res.status(400).json({ message: `Room ${roomNumber} already exists` });
    }

    // Maintenance is set explicitly; otherwise the status follows occupancy
    let updatedStatus = room.status;
    if (status === 'MAINTENANCE') {
      updatedStatus = 'MAINTENANCE';
    } else if (status || sharingType) {
      updatedStatus = room.students.length >= beds ? 'FULL' : 'AVAILABLE';
    }

    let floorData = {};
    const floorNum = parseInt(floorNumber, 10);
    if (floorNum && floorNum !== room.floorNumber) {
      const floor = await prisma.floor.findUnique({ where: { floorNumber: floorNum } });
      floorData = { floorNumber: floorNum, floorId: floor?.id || null };
    }

    const finalNumber = roomNumber || room.roomNumber;
    const bedsChanged = beds !== room.sharingType || finalNumber !== room.roomNumber;

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        roomNumber: finalNumber,
        block: block || room.block,
        sharingType: beds,
        capacity: beds,
        isAc: isAc !== undefined ? !!isAc : room.isAc,
        status: updatedStatus,
        assets: assets ? JSON.stringify(assets) : room.assets,
        ...(bedsChanged ? { bedMapping: JSON.stringify(bedLabels(finalNumber, beds)) } : {}),
        ...floorData
      }
    });

    res.json(updatedRoom);

    logActivity({ req, action: 'UPDATE', module: 'ROOM', description: `Updated room ${room.roomNumber} (Status: ${updatedStatus})`, targetId: id, targetType: 'Room' });
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

    logActivity({ req, action: 'DELETE', module: 'ROOM', description: `Deleted room ${room.roomNumber}`, targetId: id, targetType: 'Room' });
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

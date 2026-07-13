const express = require('express');
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom
} = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getAllRooms)
  .post(protect, authorize('ADMIN'), createRoom);

router.route('/:id')
  .get(protect, getRoomById)
  .put(protect, authorize('ADMIN'), updateRoom)
  .delete(protect, authorize('ADMIN'), deleteRoom);

module.exports = router;

const express = require('express');
const { listItems, createItem, updateItem, deleteItem, listMovements, addMovement, summary } = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Stock register: wardens manage items; staff (e.g. the cook) can see stock and log usage
router.get('/summary', protect, authorize('ADMIN', 'STAFF'), summary);
router.get('/items', protect, authorize('ADMIN', 'STAFF'), listItems);
router.post('/items', protect, authorize('ADMIN'), createItem);
router.put('/items/:id', protect, authorize('ADMIN'), updateItem);
router.delete('/items/:id', protect, authorize('ADMIN'), deleteItem);
router.get('/items/:id/movements', protect, authorize('ADMIN', 'STAFF'), listMovements);
router.post('/items/:id/movements', protect, authorize('ADMIN', 'STAFF'), addMovement);

module.exports = router;

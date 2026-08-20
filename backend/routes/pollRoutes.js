const express = require('express');
const {
  createPoll,
  getPolls,
  voteInPoll,
  togglePollStatus,
  deletePoll
} = require('../controllers/pollController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getPolls)
  .post(protect, authorize('ADMIN'), createPoll);

router.route('/:id/vote')
  .post(protect, voteInPoll);

router.route('/:id/toggle')
  .put(protect, authorize('ADMIN'), togglePollStatus);

router.route('/:id')
  .delete(protect, authorize('ADMIN'), deletePoll);

module.exports = router;

const express = require('express');
const {
  createPoll,
  getPolls,
  voteInPoll,
  removeVote,
  togglePollStatus,
  updatePoll,
  deletePoll
} = require('../controllers/pollController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, getPolls)
  .post(protect, authorize('ADMIN'), createPoll);

router.route('/:id/vote')
  .post(protect, voteInPoll)
  .delete(protect, removeVote);

router.route('/:id/toggle')
  .put(protect, authorize('ADMIN'), togglePollStatus);

router.route('/:id')
  .put(protect, authorize('ADMIN'), updatePoll)
  .delete(protect, authorize('ADMIN'), deletePoll);

module.exports = router;

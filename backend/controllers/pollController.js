const { PrismaClient } = require('@prisma/client');
const { broadcastPushNotification } = require('../services/pushService');
const prisma = new PrismaClient();

const TARGETS = ['ALL', 'STUDENTS', 'STAFF'];

// Which polls a role may see and vote in
const audienceFor = (role) => {
  if (role === 'STUDENT') return ['ALL', 'STUDENTS'];
  if (role === 'STAFF') return ['ALL', 'STAFF'];
  return null; // admin sees everything
};

// A poll stays open until the warden closes it or its end time passes
const isOpen = (poll) => poll.isActive && (!poll.endsAt || new Date(poll.endsAt) > new Date());

const shape = (poll, user) => {
  const parsedOptions = JSON.parse(poll.options);
  const totalVotes = poll.votes.length;
  const admin = user.role === 'ADMIN';
  const options = parsedOptions.map((opt) => {
    const votes = poll.votes.filter((v) => v.option === opt);
    return {
      option: opt,
      votes: votes.length,
      percentage: totalVotes > 0 ? Math.round((votes.length / totalVotes) * 100) : 0,
      // The warden can see who picked what, unless the poll is anonymous
      voters: admin && !poll.anonymous
        ? votes.map((v) => ({ name: v.user?.name || 'Someone', role: v.user?.role, room: v.user?.student?.room?.roomNumber || null }))
        : undefined,
    };
  });
  const mine = poll.votes.find((v) => v.userId === user.id);
  return {
    id: poll.id,
    question: poll.question,
    options,
    isActive: isOpen(poll),
    closedByWarden: !poll.isActive,
    target: poll.target,
    endsAt: poll.endsAt,
    anonymous: poll.anonymous,
    totalVotes,
    userHasVoted: !!mine,
    userVotedOption: mine ? mine.option : null,
    createdAt: poll.createdAt,
  };
};

const voteInclude = {
  votes: {
    include: { user: { select: { name: true, role: true, student: { select: { room: { select: { roomNumber: true } } } } } } },
  },
};

// @desc    Create a new poll (Admin only)
// @route   POST /api/polls
// @access  Private (Admin only)
const createPoll = async (req, res) => {
  const { question, options, target, endsAt, anonymous } = req.body;
  const q = String(question || '').trim();
  // Trimmed, blanks dropped, and "Yes" / "yes" counted once
  const opts = [];
  (Array.isArray(options) ? options : []).forEach((o) => {
    const v = String(o || '').trim();
    if (v && !opts.some((x) => x.toLowerCase() === v.toLowerCase())) opts.push(v);
  });

  if (q.length < 3) return res.status(400).json({ message: 'Write the question for the poll.' });
  if (q.length > 300) return res.status(400).json({ message: 'Keep the question under 300 characters.' });
  if (opts.length < 2) return res.status(400).json({ message: 'Add at least 2 different options.' });
  if (opts.length > 8) return res.status(400).json({ message: 'A poll can have at most 8 options.' });
  if (opts.some((o) => o.length > 100)) return res.status(400).json({ message: 'Keep each option under 100 characters.' });
  if (target !== undefined && !TARGETS.includes(target)) return res.status(400).json({ message: 'Choose who can vote: everyone, residents or staff.' });

  let end = null;
  if (endsAt) {
    end = new Date(endsAt);
    if (Number.isNaN(end.getTime())) return res.status(400).json({ message: 'The closing time is not a valid date.' });
    if (end <= new Date()) return res.status(400).json({ message: 'The closing time must be in the future.' });
  }

  try {
    const poll = await prisma.poll.create({
      data: {
        question: q,
        options: JSON.stringify(opts),
        isActive: true,
        target: target || 'ALL',
        endsAt: end,
        anonymous: !!anonymous,
        createdById: req.user.id,
      },
    });

    // Broadcast push notification for new poll
    broadcastPushNotification({
      title: '🗳️ New Poll — Your Vote Matters!',
      body: q,
      data: { type: 'POLL', pollId: poll.id },
      channelId: 'polls',
    }).catch(err => console.warn('[Poll Push Error]', err.message));

    res.status(201).json(poll);
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ message: 'Server error creating poll.' });
  }
};

// @desc    Get the polls this user can see, with results and their own vote
// @route   GET /api/polls
// @access  Private
const getPolls = async (req, res) => {
  try {
    const audience = audienceFor(req.user.role);
    const polls = await prisma.poll.findMany({
      where: audience ? { target: { in: audience } } : undefined,
      orderBy: { createdAt: 'desc' },
      include: voteInclude,
    });
    res.json(polls.map((p) => shape(p, req.user)));
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ message: 'Server error retrieving polls.' });
  }
};

// @desc    Vote in a poll, or change your vote while it is open
// @route   POST /api/polls/:id/vote
// @access  Private
const voteInPoll = async (req, res) => {
  const pollId = req.params.id;
  const userId = req.user.id;
  const { option } = req.body;

  if (!option) {
    return res.status(400).json({ message: 'Option selection is required.' });
  }

  try {
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    const audience = audienceFor(req.user.role);
    if (!poll || (audience && !audience.includes(poll.target))) {
      return res.status(404).json({ message: 'Poll not found.' });
    }
    if (!isOpen(poll)) {
      return res.status(400).json({ message: 'This poll is closed.' });
    }
    if (!JSON.parse(poll.options).includes(option)) {
      return res.status(400).json({ message: 'Invalid option selected.' });
    }

    const existing = await prisma.pollVote.findUnique({ where: { pollId_userId: { pollId, userId } } });
    const vote = existing
      ? await prisma.pollVote.update({ where: { id: existing.id }, data: { option } })
      : await prisma.pollVote.create({ data: { pollId, userId, option } });

    res.status(existing ? 200 : 201).json({ success: true, message: existing ? 'Vote changed.' : 'Vote registered successfully.', vote });
  } catch (error) {
    console.error('Error voting in poll:', error);
    res.status(500).json({ message: 'Server error voting in poll.' });
  }
};

// @desc    Take back your vote while the poll is open
// @route   DELETE /api/polls/:id/vote
// @access  Private
const removeVote = async (req, res) => {
  try {
    const poll = await prisma.poll.findUnique({ where: { id: req.params.id } });
    if (!poll) return res.status(404).json({ message: 'Poll not found.' });
    if (!isOpen(poll)) return res.status(400).json({ message: 'This poll is closed.' });
    await prisma.pollVote.deleteMany({ where: { pollId: poll.id, userId: req.user.id } });
    res.json({ success: true, message: 'Vote removed.' });
  } catch (error) {
    console.error('Error removing vote:', error);
    res.status(500).json({ message: 'Server error removing vote.' });
  }
};

// @desc    Toggle poll active status (Admin only)
// @route   PUT /api/polls/:id/toggle
// @access  Private (Admin only)
const togglePollStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const poll = await prisma.poll.findUnique({ where: { id } });

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found.' });
    }

    // Reopening a poll whose time ran out clears the old end time
    const reopen = !isOpen(poll);
    const updatedPoll = await prisma.poll.update({
      where: { id },
      data: reopen ? { isActive: true, endsAt: poll.endsAt && new Date(poll.endsAt) <= new Date() ? null : poll.endsAt } : { isActive: false },
    });

    res.json({ success: true, message: `Poll ${reopen ? 'reopened' : 'closed'}.`, poll: updatedPoll });
  } catch (error) {
    console.error('Error toggling poll status:', error);
    res.status(500).json({ message: 'Server error toggling poll status.' });
  }
};

// @desc    Delete a poll (Admin only)
// @route   DELETE /api/polls/:id
// @access  Private (Admin only)
const deletePoll = async (req, res) => {
  const { id } = req.params;

  try {
    const poll = await prisma.poll.findUnique({ where: { id } });

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found.' });
    }

    await prisma.poll.delete({ where: { id } });
    res.json({ success: true, message: 'Poll deleted successfully.' });
  } catch (error) {
    console.error('Error deleting poll:', error);
    res.status(500).json({ message: 'Server error deleting poll.' });
  }
};

module.exports = {
  createPoll,
  getPolls,
  voteInPoll,
  removeVote,
  togglePollStatus,
  deletePoll
};

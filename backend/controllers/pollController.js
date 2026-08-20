const { PrismaClient } = require('@prisma/client');
const { broadcastPushNotification } = require('../services/pushService');
const prisma = new PrismaClient();

// @desc    Create a new poll (Admin only)
// @route   POST /api/polls
// @access  Private (Admin only)
const createPoll = async (req, res) => {
  const { question, options } = req.body;

  if (!question || !options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ message: 'Question and at least 2 options are required.' });
  }

  try {
    const poll = await prisma.poll.create({
      data: {
        question,
        options: JSON.stringify(options),
        isActive: true
      }
    });

    // Broadcast push notification for new poll
    broadcastPushNotification({
      title: '🗳️ New Poll — Your Vote Matters!',
      body: question,
      data: { type: 'POLL', pollId: poll.id },
      channelId: 'polls',
    }).catch(err => console.warn('[Poll Push Error]', err.message));

    res.status(201).json(poll);
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ message: 'Server error creating poll.' });
  }
};

// @desc    Get all polls with vote status/counts
// @route   GET /api/polls
// @access  Private
const getPolls = async (req, res) => {
  const userId = req.user.id;

  try {
    const polls = await prisma.poll.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        votes: true
      }
    });

    const formattedPolls = polls.map(poll => {
      const parsedOptions = JSON.parse(poll.options);
      const totalVotes = poll.votes.length;

      // Calculate vote counts per option
      const results = {};
      parsedOptions.forEach(opt => {
        results[opt] = 0;
      });

      poll.votes.forEach(vote => {
        if (results[vote.option] !== undefined) {
          results[vote.option]++;
        }
      });

      // Map to array of option info with counts and percentages
      const optionsWithStats = parsedOptions.map(opt => {
        const count = results[opt];
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        return {
          option: opt,
          votes: count,
          percentage
        };
      });

      // Find if current user has voted in this poll
      const userVote = poll.votes.find(vote => vote.userId === userId);

      return {
        id: poll.id,
        question: poll.question,
        options: optionsWithStats,
        isActive: poll.isActive,
        totalVotes,
        userHasVoted: !!userVote,
        userVotedOption: userVote ? userVote.option : null,
        createdAt: poll.createdAt
      };
    });

    res.json(formattedPolls);
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ message: 'Server error retrieving polls.' });
  }
};

// @desc    Vote in a poll
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
    const poll = await prisma.poll.findUnique({
      where: { id: pollId }
    });

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found.' });
    }

    if (!poll.isActive) {
      return res.status(400).json({ message: 'This poll is no longer active.' });
    }

    const options = JSON.parse(poll.options);
    if (!options.includes(option)) {
      return res.status(400).json({ message: 'Invalid option selected.' });
    }

    // Check if already voted
    const existingVote = await prisma.pollVote.findUnique({
      where: {
        pollId_userId: { pollId, userId }
      }
    });

    if (existingVote) {
      return res.status(400).json({ message: 'You have already voted in this poll.' });
    }

    // Register vote
    const vote = await prisma.pollVote.create({
      data: {
        pollId,
        userId,
        option
      }
    });

    res.status(201).json({ success: true, message: 'Vote registered successfully.', vote });
  } catch (error) {
    console.error('Error voting in poll:', error);
    res.status(500).json({ message: 'Server error voting in poll.' });
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

    const updatedPoll = await prisma.poll.update({
      where: { id },
      data: { isActive: !poll.isActive }
    });

    res.json({ success: true, message: `Poll marked as ${updatedPoll.isActive ? 'active' : 'inactive'}.`, poll: updatedPoll });
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
  togglePollStatus,
  deletePoll
};

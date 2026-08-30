const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/activityLogger');

// @desc    Submit a suggestion
// @route   POST /api/v1/suggestions
// @access  Private (Student)
const createSuggestion = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Suggestion content cannot be empty.' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const suggestion = await prisma.suggestion.create({
      data: {
        studentId: student.id,
        content: content.trim(),
        status: 'PENDING'
      }
    });

    res.status(201).json({
      message: 'Thank you for your feedback! Your suggestion has been submitted.',
      suggestion
    });

    logActivity({ req, action: 'CREATE', module: 'SUGGESTION', description: `Submitted suggestion: ${content.substring(0, 80)}`, targetId: suggestion.id, targetType: 'Suggestion' });
  } catch (error) {
    console.error('Error creating suggestion:', error);
    res.status(500).json({ message: 'Server error submitting suggestion.' });
  }
};

// @desc    Get all suggestions (Admin view)
// @route   GET /api/v1/suggestions
// @access  Private (Admin / Staff)
const getSuggestions = async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) where.status = status;

    const suggestions = await prisma.suggestion.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            room: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ message: 'Server error retrieving suggestions.' });
  }
};

// @desc    Update suggestion status
// @route   PATCH /api/v1/suggestions/:id/status
// @access  Private (Admin)
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "READ", "RESOLVED"

    if (!['PENDING', 'READ', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided.' });
    }

    const updated = await prisma.suggestion.update({
      where: { id },
      data: { status }
    });

    res.json({
      message: `Suggestion marked as ${status}`,
      suggestion: updated
    });

    logActivity({ req, action: 'UPDATE', module: 'SUGGESTION', description: `Marked suggestion as ${status}`, targetId: id, targetType: 'Suggestion' });
  } catch (error) {
    console.error('Error updating suggestion status:', error);
    res.status(500).json({ message: 'Server error updating suggestion.' });
  }
};

module.exports = {
  createSuggestion,
  getSuggestions,
  updateStatus
};

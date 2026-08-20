const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Get aggregated dashboard data (role-aware single endpoint)
// @route   GET /api/dashboard
// @access  Private
const getDashboard = async (req, res) => {
  const { role, id: userId } = req.user;

  try {
    let dashboardData = {};

    if (role === 'ADMIN') {
      // Admin Dashboard - comprehensive stats
      const [
        rooms,
        students,
        recentLeaves,
        recentComplaints,
        pendingApprovals,
        profileChangeRequests,
        activeVisitors,
        messAttendanceToday,
        recentInvoices
      ] = await Promise.all([
        // Rooms
        prisma.room.findMany({
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
        }),

        // Students
        prisma.student.findMany({
          include: {
            user: {
              select: {
                name: true,
                email: true,
                role: true
              }
            },
            room: true
          }
        }),
        
        // Recent leaves (last 10)
        prisma.leaveRequest.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            student: {
              include: {
                user: {
                  select: { name: true, email: true }
                }
              }
            }
          }
        }),
        
        // Recent complaints (last 10)
        prisma.complaint.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            student: {
              include: {
                user: {
                  select: { name: true, email: true }
                }
              }
            }
          }
        }),
        
        // Pending approvals
        prisma.user.findMany({
          where: { role: { startsWith: 'PENDING' } },
          include: {
            student: true,
            staff: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        
        // Profile change requests (pending leaves + complaints)
        prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
        
        // Active visitors
        prisma.visitor.findMany({
          where: { checkOutTime: null },
          orderBy: { checkInTime: 'desc' },
          include: {
            student: {
              include: {
                user: {
                  select: { name: true }
                },
                room: true
              }
            }
          }
        }),
        
        // Mess attendance today
        prisma.messAttendance.count({
          where: {
            date: new Date().toISOString().split('T')[0]
          }
        }),
        
        // Recent invoices
        prisma.invoice.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            student: {
              include: {
                user: {
                  select: { name: true }
                }
              }
            }
          }
        })
      ]);

      // Calculate pending complaints count
      const pendingComplaints = await prisma.complaint.count({
        where: { status: 'PENDING' }
      });

      const totalStudents = students.length;
      const totalRooms = rooms.length;
      const availableRooms = rooms.filter(r => r.status === 'AVAILABLE').length;

      // Get latest active/inactive poll
      const latestPoll = await prisma.poll.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { votes: true }
      });

      let formattedLatestPoll = null;
      if (latestPoll) {
        const parsedOptions = JSON.parse(latestPoll.options);
        const totalVotes = latestPoll.votes.length;
        const results = {};
        parsedOptions.forEach(opt => { results[opt] = 0; });
        latestPoll.votes.forEach(vote => { if (results[vote.option] !== undefined) results[vote.option]++; });
        const optionsWithStats = parsedOptions.map(opt => ({
          option: opt,
          votes: results[opt],
          percentage: totalVotes > 0 ? Math.round((results[opt] / totalVotes) * 100) : 0
        }));
        formattedLatestPoll = {
          id: latestPoll.id,
          question: latestPoll.question,
          options: optionsWithStats,
          isActive: latestPoll.isActive,
          totalVotes,
          createdAt: latestPoll.createdAt
        };
      }

      dashboardData = {
        role: 'ADMIN',
        stats: {
          totalStudents,
          totalRooms,
          availableRooms,
          occupiedRooms: totalRooms - availableRooms,
          pendingLeaves: profileChangeRequests,
          pendingComplaints,
          pendingApprovals: pendingApprovals.length,
          activeVisitors: activeVisitors.length,
          messAttendanceToday
        },
        rooms,
        students,
        recentLeaves,
        recentComplaints,
        pendingApprovals,
        activeVisitors,
        recentInvoices,
        latestPoll: formattedLatestPoll
      };

    } else if (role === 'STUDENT') {
      // Student Dashboard - personal data only
      const student = await prisma.student.findUnique({
        where: { userId },
        include: {
          user: true,
          room: true,
          leaveRequests: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          complaints: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          messAttendance: {
            orderBy: { date: 'desc' },
            take: 30
          }
        }
      });

      if (!student) {
        return res.status(404).json({ message: 'Student profile not found' });
      }

      // Get document upload info (if you have a documents table)
      // For now, we'll just send an empty array
      const documents = [];

      // Calculate stats
      const totalLeaves = await prisma.leaveRequest.count({
        where: { studentId: student.id }
      });

      const approvedLeaves = await prisma.leaveRequest.count({
        where: { studentId: student.id, status: 'APPROVED' }
      });

      const totalComplaints = await prisma.complaint.count({
        where: { studentId: student.id }
      });

      const resolvedComplaints = await prisma.complaint.count({
        where: { studentId: student.id, status: 'RESOLVED' }
      });

      const unpaidInvoices = await prisma.invoice.count({
        where: { studentId: student.id, status: 'UNPAID' }
      });

      const totalDue = await prisma.invoice.aggregate({
        where: { studentId: student.id, status: 'UNPAID' },
        _sum: { amount: true }
      });

      // Get latest active/inactive poll
      const latestPoll = await prisma.poll.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { votes: true }
      });

      let formattedLatestPoll = null;
      if (latestPoll) {
        const parsedOptions = JSON.parse(latestPoll.options);
        const totalVotes = latestPoll.votes.length;
        const results = {};
        parsedOptions.forEach(opt => { results[opt] = 0; });
        latestPoll.votes.forEach(vote => { if (results[vote.option] !== undefined) results[vote.option]++; });
        const optionsWithStats = parsedOptions.map(opt => ({
          option: opt,
          votes: results[opt],
          percentage: totalVotes > 0 ? Math.round((results[opt] / totalVotes) * 100) : 0
        }));
        const userVote = latestPoll.votes.find(vote => vote.userId === userId);
        formattedLatestPoll = {
          id: latestPoll.id,
          question: latestPoll.question,
          options: optionsWithStats,
          isActive: latestPoll.isActive,
          totalVotes,
          userHasVoted: !!userVote,
          userVotedOption: userVote ? userVote.option : null,
          createdAt: latestPoll.createdAt
        };
      }

      dashboardData = {
        role: 'STUDENT',
        profile: {
          id: student.id,
          name: student.user.name,
          email: student.user.email,
          rollNumber: student.rollNumber,
          phoneNumber: student.phoneNumber,
          parentContact: student.parentContact,
          status: student.status,
          room: student.room ? {
            id: student.room.id,
            roomNumber: student.room.roomNumber,
            block: student.room.block,
            floor: student.room.floor,
            sharingType: student.room.sharingType,
            isAc: student.room.isAc
          } : null
        },
        stats: {
          totalLeaves,
          approvedLeaves,
          pendingLeaves: totalLeaves - approvedLeaves,
          totalComplaints,
          resolvedComplaints,
          pendingComplaints: totalComplaints - resolvedComplaints,
          unpaidInvoices,
          totalDue: totalDue._sum.amount || 0
        },
        leaves: student.leaveRequests,
        complaints: student.complaints,
        invoices: student.invoices,
        messAttendance: student.messAttendance,
        documents,
        latestPoll: formattedLatestPoll
      };

    } else if (role === 'STAFF') {
      // Staff Dashboard - limited access
      const staff = await prisma.staff.findUnique({
        where: { userId },
        include: {
          user: true
        }
      });

      if (!staff) {
        return res.status(404).json({ message: 'Staff profile not found' });
      }

      const [
        recentLeaves,
        activeVisitors,
        totalStudents
      ] = await Promise.all([
        prisma.leaveRequest.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            student: {
              include: {
                user: {
                  select: { name: true }
                },
                room: true
              }
            }
          }
        }),
        
        prisma.visitor.findMany({
          where: { checkOutTime: null },
          orderBy: { checkInTime: 'desc' },
          include: {
            student: {
              include: {
                user: {
                  select: { name: true }
                },
                room: true
              }
            }
          }
        }),
        
        prisma.student.count()
      ]);

      dashboardData = {
        role: 'STAFF',
        profile: {
          id: staff.id,
          name: staff.user.name,
          email: staff.user.email,
          department: staff.department,
          designation: staff.designation,
          phoneNumber: staff.phoneNumber
        },
        stats: {
          totalStudents,
          activeVisitors: activeVisitors.length,
          recentLeaves: recentLeaves.length
        },
        recentLeaves,
        activeVisitors
      };

    } else {
      return res.status(403).json({ message: 'Invalid role or access denied' });
    }

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
};

module.exports = {
  getDashboard
};

/**
 * Activity Logger Utility
 * Reusable helper for logging user actions across all modules.
 * Usage:
 *   const { logActivity } = require('../utils/activityLogger');
 *   await logActivity({ userId, userName, userRole, action, module, description, targetId, targetType, req });
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Log an activity to the ActivityLog table.
 * This function is fire-and-forget — it never throws and never blocks the response.
 *
 * @param {Object} opts
 * @param {string}  [opts.userId]      - User ID who performed the action
 * @param {string}  [opts.userName]    - User's display name
 * @param {string}  [opts.userRole]    - "ADMIN" | "STUDENT" | "STAFF"
 * @param {string}   opts.action       - "LOGIN" | "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | etc.
 * @param {string}   opts.module       - "AUTH" | "LEAVE" | "COMPLAINT" | "FEE" | "ROOM" | "VISITOR" | "MESS" | "ACCOUNTING" | etc.
 * @param {string}   opts.description  - Human-readable description
 * @param {string}  [opts.targetId]    - ID of the affected record
 * @param {string}  [opts.targetType]  - "Student" | "LeaveRequest" | "Complaint" | "Voucher" | etc.
 * @param {Object}  [opts.metadata]    - Extra details (will be JSON-stringified)
 * @param {Object}  [opts.req]         - Express request object (to extract IP & user info)
 */
const logActivity = async (opts) => {
  try {
    // Auto-extract user info from req if not explicitly provided
    const userId = opts.userId || opts.req?.user?.id || null;
    const userName = opts.userName || opts.req?.user?.name || null;
    const userRole = opts.userRole || opts.req?.user?.role || null;
    const ipAddress = opts.req?.ip || opts.req?.headers?.['x-forwarded-for'] || opts.req?.connection?.remoteAddress || null;

    await prisma.activityLog.create({
      data: {
        userId,
        userName,
        userRole,
        action: opts.action,
        module: opts.module,
        description: opts.description,
        targetId: opts.targetId || null,
        targetType: opts.targetType || null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
        ipAddress,
      }
    });
  } catch (err) {
    // Never block the main flow — just log to console
    console.error('[ActivityLogger] Failed to log activity:', err.message);
  }
};

module.exports = { logActivity };

/**
 * Optimized request logger middleware for Hari Pushp PG backend.
 * Prints clean, formatted single-line terminal logs with ANSI status colors.
 */
const logger = (req, res, next) => {
  const { method, originalUrl, body } = req;

  // Suppress health check pings to avoid flooding terminal console
  if (originalUrl && originalUrl.includes('/health')) {
    return next();
  }

  const start = Date.now();

  const maskObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const masked = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const key in masked) {
      if (['password', 'token', 'secret', 'jwt'].includes(key.toLowerCase())) {
        masked[key] = '********';
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = maskObject(masked[key]);
      }
    }
    return masked;
  };

  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // ANSI Colors
    let statusColor = '\x1b[32m'; // Green (2xx)
    if (statusCode >= 300 && statusCode < 400) statusColor = '\x1b[36m'; // Cyan (3xx)
    else if (statusCode >= 400 && statusCode < 500) statusColor = '\x1b[33m'; // Yellow (4xx)
    else if (statusCode >= 500) statusColor = '\x1b[31m'; // Red (5xx)
    const resetColor = '\x1b[0m';
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });

    console.log(`[${timeStr}] ${method} ${originalUrl} -> ${statusColor}${statusCode}${resetColor} (${duration}ms)`);

    // Log payload for non-GET requests if present
    if (method !== 'GET' && body && Object.keys(body).length > 0) {
      const masked = maskObject(body);
      const payloadStr = JSON.stringify(masked);
      console.log(`   └─ Payload: ${payloadStr.length > 120 ? payloadStr.substring(0, 120) + '...' : payloadStr}`);
    }

    // Log message for errors (4xx or 5xx)
    if (statusCode >= 400 && data && data.message) {
      console.log(`   └─ Error Msg: ${data.message}`);
    }

    return originalJson.call(this, data);
  };

  next();
};

module.exports = logger;

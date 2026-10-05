const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Log activity helper function
 * @param {Object} params
 * @param {Object} [params.req] - Express request object (to extract user and ip)
 * @param {Object} [params.user] - User object (if req is not available or custom)
 * @param {string} params.action - e.g. 'LOGIN', 'STOCK_ADJUSTMENT', 'PRODUCT_CREATE', etc.
 * @param {string} params.entity - e.g. 'AUTH', 'PRODUCT', 'SALE', 'PURCHASE', 'TRANSFER', 'CONTACT'
 * @param {string|number} [params.entityId] - ID of affected entity
 * @param {string} [params.targetName] - Human readable target name (Product name, invoice no, contact name)
 * @param {string|object} [params.details] - Summary or details of change
 */
const logActivity = async ({ req, user, action, entity, entityId, targetName, details }) => {
  try {
    const activeUser = user || req?.user;
    let ipAddress = null;
    if (req) {
      const forwarded = req.headers['x-forwarded-for'];
      ipAddress = forwarded ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || null);
      if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
        ipAddress = '127.0.0.1';
      }
    }

    let detailStr = details;
    if (typeof details === 'object' && details !== null) {
      try {
        detailStr = JSON.stringify(details);
      } catch {
        detailStr = String(details);
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: activeUser?.id || null,
        userName: activeUser?.name || 'Sistem',
        userRole: activeUser?.role || 'SYSTEM',
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        targetName: targetName || null,
        details: detailStr || null,
        ipAddress
      }
    });
  } catch (error) {
    // Audit logging should never crash the main application flow
    console.error('[AuditLogger] Gagal menyimpan log aktivitas:', error.message);
  }
};

module.exports = { logActivity };

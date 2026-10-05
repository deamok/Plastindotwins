const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Ambil riwayat audit log dengan filter dan pagination
exports.getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const { search, action, entity, userRole, startDate, endDate } = req.query;

    const where = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { targetName: { contains: q, mode: 'insensitive' } },
        { userName: { contains: q, mode: 'insensitive' } },
        { details: { contains: q, mode: 'insensitive' } }
      ];
    }

    if (action && action !== 'ALL') {
      where.action = action;
    }

    if (entity && entity !== 'ALL') {
      where.entity = entity;
    }

    if (userRole && userRole !== 'ALL') {
      where.userRole = userRole;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true
            }
          }
        }
      })
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Gagal mengambil audit logs:', error);
    res.status(500).json({ message: 'Gagal mengambil riwayat aktivitas.', error: error.message });
  }
};

// Statistik ringkasan aktivitas
exports.getAuditStats = async (req, res) => {
  try {
    const totalLogs = await prisma.auditLog.count();
    
    // 7 hari terakhir
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLogsCount = await prisma.auditLog.count({
      where: { createdAt: { gte: sevenDaysAgo } }
    });

    // Breakdown per Entity
    const entityCounts = await prisma.auditLog.groupBy({
      by: ['entity'],
      _count: { id: true }
    });

    res.status(200).json({
      success: true,
      data: {
        totalLogs,
        recentLogsCount,
        entityBreakdown: entityCounts.map(e => ({ entity: e.entity, count: e._count.id }))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil statistik log.', error: error.message });
  }
};

// Pembersihan log lama (Retention Management)
exports.cleanupAuditLogs = async (req, res) => {
  try {
    const days = parseInt(req.body.days) || 180;
    if (days < 30) {
      return res.status(400).json({ message: 'Batas minimal retensi pembersihan log adalah 30 hari.' });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } }
    });

    res.status(200).json({
      success: true,
      message: `Berhasil membersihkan ${result.count} data log yang berusia lebih dari ${days} hari.`,
      deletedCount: result.count
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal membersihkan log lama.', error: error.message });
  }
};

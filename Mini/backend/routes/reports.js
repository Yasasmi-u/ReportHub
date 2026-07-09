import express from 'express';
import { getDbConnection } from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ==========================================
// MEMBER ROUTES (Personal Reports)
// ==========================================

// Get user's own report history
router.get('/my-history', authMiddleware, async (req, res) => {
  try {
    const db = await getDbConnection();
    const reports = await db.all(`
      SELECT r.*, p.name as project_name 
      FROM reports r
      JOIN projects p ON r.project_id = p.id
      WHERE r.user_id = ?
      ORDER BY r.week_identifier DESC, r.created_at DESC
    `, [req.user.id]);
    
    // Parse JSON strings back to arrays
    reports.forEach(r => {
      try {
        r.tasks_completed = JSON.parse(r.tasks_completed);
      } catch (e) { r.tasks_completed = []; }
      
      try {
        r.tasks_planned = JSON.parse(r.tasks_planned);
      } catch (e) { r.tasks_planned = []; }
    });

    res.json({ reports });
  } catch (err) {
    console.error('Fetch history error:', err);
    res.status(500).json({ error: 'Database error fetching report history.' });
  }
});

// Create or Update report (Save draft or Submit)
router.post('/', authMiddleware, async (req, res) => {
  const {
    id, // Optional, if updating
    project_id,
    week_identifier,
    start_date,
    end_date,
    tasks_completed,
    tasks_planned,
    blockers,
    hours_worked,
    notes,
    status
  } = req.body;

  if (!project_id || !week_identifier || !start_date || !end_date || !status) {
    return res.status(400).json({ error: 'Required fields: project_id, week_identifier, start_date, end_date, status.' });
  }

  if (status !== 'draft' && status !== 'submitted') {
    return res.status(400).json({ error: 'Status must be "draft" or "submitted".' });
  }

  const tasksCompStr = JSON.stringify(Array.isArray(tasks_completed) ? tasks_completed : []);
  const tasksPlanStr = JSON.stringify(Array.isArray(tasks_planned) ? tasks_planned : []);
  const finalHours = hours_worked !== undefined && hours_worked !== null && hours_worked !== '' ? parseFloat(hours_worked) : null;
  const submittedAt = status === 'submitted' ? new Date().toISOString() : null;

  try {
    const db = await getDbConnection();

    // Verify project exists
    const proj = await db.get('SELECT id FROM projects WHERE id = ?', [project_id]);
    if (!proj) {
      return res.status(400).json({ error: 'Selected project does not exist.' });
    }

    let reportId = id;
    if (reportId) {
      // Update existing
      const existing = await db.get('SELECT user_id FROM reports WHERE id = ?', [reportId]);
      if (!existing) {
        return res.status(404).json({ error: 'Report not found.' });
      }
      if (existing.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied. You cannot modify another user\'s report.' });
      }

      await db.run(`
        UPDATE reports 
        SET project_id = ?, week_identifier = ?, start_date = ?, end_date = ?, 
            tasks_completed = ?, tasks_planned = ?, blockers = ?, 
            hours_worked = ?, notes = ?, status = ?, submitted_at = COALESCE(submitted_at, ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        project_id, week_identifier, start_date, end_date,
        tasksCompStr, tasksPlanStr, blockers || '', finalHours,
        notes || '', status, submittedAt, reportId
      ]);
    } else {
      // Check if user already submitted a report for this week and project
      const duplicate = await db.get(
        'SELECT id FROM reports WHERE user_id = ? AND week_identifier = ? AND project_id = ?',
        [req.user.id, week_identifier, project_id]
      );
      if (duplicate) {
        return res.status(400).json({ error: 'A report for this project in this week already exists. Please edit it instead.' });
      }

      const result = await db.run(`
        INSERT INTO reports (user_id, project_id, week_identifier, start_date, end_date, tasks_completed, tasks_planned, blockers, hours_worked, notes, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.user.id, project_id, week_identifier, start_date, end_date,
        tasksCompStr, tasksPlanStr, blockers || '', finalHours,
        notes || '', status, submittedAt
      ]);
      reportId = result.lastID;
    }

    res.json({
      message: status === 'submitted' ? 'Report submitted successfully.' : 'Draft saved successfully.',
      reportId
    });
  } catch (err) {
    console.error('Save report error:', err);
    res.status(500).json({ error: 'Database error saving report.' });
  }
});

// Delete a draft report
router.delete('/:id', authMiddleware, async (req, res) => {
  const reportId = req.params.id;
  try {
    const db = await getDbConnection();
    const report = await db.get('SELECT * FROM reports WHERE id = ?', [reportId]);
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    if (report.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    if (report.status === 'submitted') {
      return res.status(400).json({ error: 'Cannot delete a submitted report.' });
    }
    await db.run('DELETE FROM reports WHERE id = ?', [reportId]);
    res.json({ message: 'Draft deleted successfully.' });
  } catch (err) {
    console.error('Delete draft error:', err);
    res.status(500).json({ error: 'Database error deleting draft.' });
  }
});

// ==========================================
// MANAGER ROUTES (Team Dashboard & Analytics)
// ==========================================

// Get summary metrics for a specific week
router.get('/manager/summary', authMiddleware, requireRole('manager'), async (req, res) => {
  const { week } = req.query;
  if (!week) {
    return res.status(400).json({ error: 'Week query parameter is required (e.g. 2026-W28).' });
  }

  try {
    const db = await getDbConnection();

    // 1. Total team members
    const teamCountRow = await db.get('SELECT COUNT(*) as count FROM users WHERE role = "member"');
    const totalMembers = teamCountRow.count;

    // 2. Total reports submitted this week
    const submittedRow = await db.get(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM reports 
      WHERE week_identifier = ? AND status = 'submitted'
    `, [week]);
    const submittedCount = submittedRow.count;

    // 3. Open blockers this week
    const blockersRow = await db.get(`
      SELECT COUNT(*) as count 
      FROM reports 
      WHERE week_identifier = ? AND blockers IS NOT NULL AND blockers != '' AND blockers != 'None' AND blockers != 'none'
    `, [week]);
    const openBlockers = blockersRow.count;

    // Compliance rate
    const complianceRate = totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0;

    res.json({
      week,
      totalMembers,
      submittedCount,
      openBlockers,
      complianceRate
    });
  } catch (err) {
    console.error('Fetch dashboard summary error:', err);
    res.status(500).json({ error: 'Database error fetching dashboard summary.' });
  }
});

// Get team reports (filtered)
router.get('/manager/reports', authMiddleware, requireRole('manager'), async (req, res) => {
  const { week, member, project } = req.query;
  
  let query = `
    SELECT r.*, u.name as user_name, u.email as user_email, p.name as project_name
    FROM reports r
    JOIN users u ON r.user_id = u.id
    JOIN projects p ON r.project_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (week) {
    query += ` AND r.week_identifier = ? `;
    params.push(week);
  }
  if (member) {
    query += ` AND r.user_id = ? `;
    params.push(parseInt(member));
  }
  if (project) {
    query += ` AND r.project_id = ? `;
    params.push(parseInt(project));
  }

  query += ` ORDER BY r.week_identifier DESC, r.submitted_at DESC, u.name ASC `;

  try {
    const db = await getDbConnection();
    const reports = await db.all(query, params);

    reports.forEach(r => {
      try {
        r.tasks_completed = JSON.parse(r.tasks_completed);
      } catch (e) { r.tasks_completed = []; }
      
      try {
        r.tasks_planned = JSON.parse(r.tasks_planned);
      } catch (e) { r.tasks_planned = []; }
    });

    res.json({ reports });
  } catch (err) {
    console.error('Fetch manager reports error:', err);
    res.status(500).json({ error: 'Database error fetching team reports.' });
  }
});

// Get analytics (charts data)
router.get('/manager/analytics', authMiddleware, requireRole('manager'), async (req, res) => {
  const { week } = req.query;
  if (!week) {
    return res.status(400).json({ error: 'Week query parameter is required.' });
  }

  try {
    const db = await getDbConnection();

    // 1. Report submission status by team member for selected week
    // We want to see: user name, and whether they have submitted, draft, or pending (no entry)
    const members = await db.all('SELECT id, name FROM users WHERE role = "member" ORDER BY name ASC');
    const memberSubmissions = [];

    for (let m of members) {
      // Find report for this week
      const reports = await db.all('SELECT status FROM reports WHERE user_id = ? AND week_identifier = ?', [m.id, week]);
      
      let status = 'pending';
      if (reports.length > 0) {
        // If any report is submitted, status is submitted
        const hasSubmitted = reports.some(r => r.status === 'submitted');
        status = hasSubmitted ? 'submitted' : 'draft';
      }

      memberSubmissions.push({
        userId: m.id,
        name: m.name,
        status: status // 'submitted', 'draft', 'pending'
      });
    }

    // 2. Tasks completed trend over time (last 6 weeks)
    // Get distinct weeks from database
    const weeksList = await db.all(`
      SELECT DISTINCT week_identifier 
      FROM reports 
      WHERE status = 'submitted'
      ORDER BY week_identifier ASC 
      LIMIT 6
    `);

    const taskTrend = [];
    for (let w of weeksList) {
      const reportsInWeek = await db.all(`
        SELECT tasks_completed 
        FROM reports 
        WHERE week_identifier = ? AND status = 'submitted'
      `, [w.week_identifier]);
      
      let totalTasks = 0;
      reportsInWeek.forEach(r => {
        try {
          const list = JSON.parse(r.tasks_completed);
          if (Array.isArray(list)) {
            totalTasks += list.length;
          }
        } catch (e) {}
      });

      taskTrend.push({
        week: w.week_identifier,
        completedTasksCount: totalTasks
      });
    }

    // 3. Workload/task distribution by project (for the selected week)
    const projectHours = await db.all(`
      SELECT p.name as projectName, SUM(r.hours_worked) as totalHours, COUNT(r.id) as reportCount
      FROM reports r
      JOIN projects p ON r.project_id = p.id
      WHERE r.week_identifier = ? AND r.status = 'submitted'
      GROUP BY r.project_id
    `, [week]);

    res.json({
      memberSubmissions,
      taskTrend,
      projectHours
    });
  } catch (err) {
    console.error('Fetch manager analytics error:', err);
    res.status(500).json({ error: 'Database error fetching analytics data.' });
  }
});

export default router;

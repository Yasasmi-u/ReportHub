import express from 'express';
import { getDbConnection } from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

// List all projects
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDbConnection();
    
    // If user is a member, we can also fetch projects they are explicitly assigned to, or list all.
    // The core requirements say "Assign team members to relevant projects (optional)".
    // So let's return all projects, and for each project, include its assigned members list.
    const projects = await db.all('SELECT * FROM projects ORDER BY created_at DESC');
    
    // For each project, fetch its assigned user IDs and names
    for (let proj of projects) {
      const assignments = await db.all(`
        SELECT u.id, u.name, u.email 
        FROM project_assignments pa
        JOIN users u ON pa.user_id = u.id
        WHERE pa.project_id = ?
      `, [proj.id]);
      proj.assignedUsers = assignments;
    }
    
    res.json({ projects });
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Database error listing projects.' });
  }
});

// Create project (Manager only)
router.post('/', authMiddleware, requireRole('manager'), async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Project name is required.' });
  }

  try {
    const db = await getDbConnection();
    const result = await db.run(
      'INSERT INTO projects (name, description) VALUES (?, ?)',
      [name, description || '']
    );
    res.status(201).json({
      message: 'Project created successfully.',
      project: { id: result.lastID, name, description, created_at: new Date() }
    });
  } catch (err) {
    console.error('Create project error:', err);
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A project with this name already exists.' });
    }
    res.status(500).json({ error: 'Database error creating project.' });
  }
});

// Update project (Manager only)
router.put('/:id', authMiddleware, requireRole('manager'), async (req, res) => {
  const { name, description } = req.body;
  const projectId = req.params.id;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required.' });
  }

  try {
    const db = await getDbConnection();
    const project = await db.get('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    await db.run(
      'UPDATE projects SET name = ?, description = ? WHERE id = ?',
      [name, description, projectId]
    );

    res.json({ message: 'Project updated successfully.' });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Database error updating project.' });
  }
});

// Delete project (Manager only)
router.delete('/:id', authMiddleware, requireRole('manager'), async (req, res) => {
  const projectId = req.params.id;
  try {
    const db = await getDbConnection();
    const project = await db.get('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Cascade delete is handled by database foreign key constraint
    await db.run('DELETE FROM projects WHERE id = ?', [projectId]);
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Database error deleting project.' });
  }
});

// Update project assignments (Manager only)
// Takes userIds: [1, 2, 3] and syncs assignments
router.post('/:id/assign', authMiddleware, requireRole('manager'), async (req, res) => {
  const projectId = req.params.id;
  const { userIds } = req.body; // Array of user IDs

  if (!Array.isArray(userIds)) {
    return res.status(400).json({ error: 'userIds must be an array.' });
  }

  try {
    const db = await getDbConnection();
    
    // Check if project exists
    const project = await db.get('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Wrap in transaction for safety
    await db.run('BEGIN TRANSACTION');
    
    // Delete existing assignments for this project
    await db.run('DELETE FROM project_assignments WHERE project_id = ?', [projectId]);

    // Insert new assignments
    for (let userId of userIds) {
      // Verify user is a member
      const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
      if (user && user.role === 'member') {
        await db.run(
          'INSERT INTO project_assignments (project_id, user_id) VALUES (?, ?)',
          [projectId, userId]
        );
      }
    }
    
    await db.run('COMMIT');

    res.json({ message: 'Project assignments updated successfully.' });
  } catch (err) {
    console.error('Assign users error:', err);
    try {
      const db = await getDbConnection();
      await db.run('ROLLBACK');
    } catch (_) {}
    res.status(500).json({ error: 'Database error updating assignments.' });
  }
});

// Get all team members (Manager only) - to show in assignments select box
router.get('/team-members', authMiddleware, requireRole('manager'), async (req, res) => {
  try {
    const db = await getDbConnection();
    const members = await db.all('SELECT id, name, email FROM users WHERE role = "member" ORDER BY name ASC');
    res.json({ members });
  } catch (err) {
    console.error('List members error:', err);
    res.status(500).json({ error: 'Database error listing team members.' });
  }
});

export default router;

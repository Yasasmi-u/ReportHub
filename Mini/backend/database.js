import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, 'database.sqlite');

let db = null;

export async function getDbConnection() {
  if (db) return db;

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON');

  return db;
}

export async function setupDatabase() {
  const connection = await getDbConnection();

  // Create Users Table
  await connection.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('member', 'manager')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Projects Table
  await connection.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Project Assignments Table
  await connection.exec(`
    CREATE TABLE IF NOT EXISTS project_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    )
  `);

  // Create Reports Table
  await connection.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      week_identifier TEXT NOT NULL, -- e.g., "2026-W27"
      start_date TEXT NOT NULL,      -- "YYYY-MM-DD"
      end_date TEXT NOT NULL,        -- "YYYY-MM-DD"
      tasks_completed TEXT NOT NULL,  -- JSON string of list
      tasks_planned TEXT NOT NULL,    -- JSON string of list
      blockers TEXT,
      hours_worked REAL,
      notes TEXT,
      status TEXT NOT NULL CHECK (status IN ('draft', 'submitted')),
      submitted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(user_id, week_identifier, project_id) -- unique report per user per week per project
    )
  `);

  console.log('Database tables verified/created successfully.');
}

export async function seedDatabase() {
  const connection = await getDbConnection();

  // Check if users already exist
  const userCount = await connection.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Seeding initial data...');

  const pwManager = await bcrypt.hash('manager123', 10);
  const pwMember = await bcrypt.hash('member123', 10);

  // Insert Users
  const aliceId = (await connection.run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    ['Alice Manager', 'manager@example.com', pwManager, 'manager']
  )).lastID;

  const bobId = (await connection.run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    ['Bob Member', 'bob@example.com', pwMember, 'member']
  )).lastID;

  const charlieId = (await connection.run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    ['Charlie Member', 'charlie@example.com', pwMember, 'member']
  )).lastID;

  const daveId = (await connection.run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    ['Dave Member', 'dave@example.com', pwMember, 'member']
  )).lastID;

  // Insert Projects
  const projAId = (await connection.run(
    'INSERT INTO projects (name, description) VALUES (?, ?)',
    ['Client A Portal', 'Development of Client A\'s customer-facing portal and services.']
  )).lastID;

  const projBId = (await connection.run(
    'INSERT INTO projects (name, description) VALUES (?, ?)',
    ['Internal Tooling', 'Improving deployment scripts and local development environment setup.']
  )).lastID;

  const projCId = (await connection.run(
    'INSERT INTO projects (name, description) VALUES (?, ?)',
    ['R&D Lab', 'Researching and prototyping new frontend architectural paradigms.']
  )).lastID;

  const projDId = (await connection.run(
    'INSERT INTO projects (name, description) VALUES (?, ?)',
    ['Marketing Website', 'Complete redesign of our corporate marketing website landing pages.']
  )).lastID;

  // Insert Project Assignments
  await connection.run('INSERT INTO project_assignments (project_id, user_id) VALUES (?, ?)', [projAId, bobId]);
  await connection.run('INSERT INTO project_assignments (project_id, user_id) VALUES (?, ?)', [projCId, bobId]);

  await connection.run('INSERT INTO project_assignments (project_id, user_id) VALUES (?, ?)', [projAId, charlieId]);
  await connection.run('INSERT INTO project_assignments (project_id, user_id) VALUES (?, ?)', [projBId, charlieId]);

  await connection.run('INSERT INTO project_assignments (project_id, user_id) VALUES (?, ?)', [projCId, daveId]);
  await connection.run('INSERT INTO project_assignments (project_id, user_id) VALUES (?, ?)', [projDId, daveId]);

  // Insert Historical Weekly Reports
  // Let's create reports for:
  // Week 26 (June 22 - June 28)
  // Week 27 (June 29 - July 5)

  // Bob's reports
  await connection.run(`
    INSERT INTO reports (user_id, project_id, week_identifier, start_date, end_date, tasks_completed, tasks_planned, blockers, hours_worked, notes, status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    bobId, projAId, '2026-W26', '2026-06-22', '2026-06-28',
    JSON.stringify(['Designed database schema for Client A portal', 'Wrote Express API endpoints mock']),
    JSON.stringify(['Integrate frontend login form with backend API', 'Deploy preliminary staging environment']),
    'None', 38.5, 'Feedback from Client A was positive regarding the endpoints schema design.',
    'submitted', '2026-06-26 16:30:00'
  ]);

  await connection.run(`
    INSERT INTO reports (user_id, project_id, week_identifier, start_date, end_date, tasks_completed, tasks_planned, blockers, hours_worked, notes, status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    bobId, projAId, '2026-W27', '2026-06-29', '2026-07-05',
    JSON.stringify(['Connected frontend portal to login API', 'Resolved CORS authentication session issues']),
    JSON.stringify(['Build report layout and dashboard interface', 'Implement dynamic filters']),
    'API response latency on the mock server has slowed down integration testing slightly.', 40.0, 'Need to resolve mock server performance next week.',
    'submitted', '2026-07-03 17:00:00'
  ]);

  // Charlie's reports
  await connection.run(`
    INSERT INTO reports (user_id, project_id, week_identifier, start_date, end_date, tasks_completed, tasks_planned, blockers, hours_worked, notes, status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    charlieId, projBId, '2026-W26', '2026-06-22', '2026-06-28',
    JSON.stringify(['Researched webpack compiler errors in legacy repos', 'Migrated builder profile from Webpack to Vite']),
    JSON.stringify(['Fix staging pipeline environment errors', 'Document Vite migration steps']),
    'Docker configuration script throws permissions error on local Windows setups.', 35.0, '',
    'submitted', '2026-06-28 12:00:00'
  ]);

  await connection.run(`
    INSERT INTO reports (user_id, project_id, week_identifier, start_date, end_date, tasks_completed, tasks_planned, blockers, hours_worked, notes, status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    charlieId, projBId, '2026-W27', '2026-06-29', '2026-07-05',
    JSON.stringify(['Drafted staging container deployment files', 'Updated Docker network config to use bridge mode']),
    JSON.stringify(['Deploy beta test container to environment', 'Perform stress testing on internal DB']),
    'Waiting on DevOps manager for container registry keys.', 32.5, 'Spoke with DevOps, credentials expected by Tuesday.',
    'draft', null
  ]);

  // Dave's reports
  await connection.run(`
    INSERT INTO reports (user_id, project_id, week_identifier, start_date, end_date, tasks_completed, tasks_planned, blockers, hours_worked, notes, status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    daveId, projDId, '2026-W26', '2026-06-22', '2026-06-28',
    JSON.stringify(['Created initial layout designs for landing page', 'Reviewed typography suggestions from marketing']),
    JSON.stringify(['Implement CSS grid layout and dark-mode styles', 'Write custom animations']),
    'None', 30.0, 'Draft design fits the marketing brief closely.',
    'submitted', '2026-06-26 15:00:00'
  ]);

  await connection.run(`
    INSERT INTO reports (user_id, project_id, week_identifier, start_date, end_date, tasks_completed, tasks_planned, blockers, hours_worked, notes, status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    daveId, projDId, '2026-W27', '2026-06-29', '2026-07-05',
    JSON.stringify(['Finished CSS grids and layout, optimized SVG files', 'Implemented CSS transitions and micro-animations']),
    JSON.stringify(['A/B testing configuration setup', 'Connect contact form to Hubspot API']),
    'Corporate DNS routing team hasn\'t approved marketing-stage subdomain routing.', 36.0, 'Escalated the DNS approval to team lead.',
    'submitted', '2026-07-05 18:30:00'
  ]);

  console.log('Database seeded successfully.');
}

// Allow direct execution to seed
if (process.argv.includes('--seed')) {
  (async () => {
    try {
      await setupDatabase();
      await seedDatabase();
      console.log('Done!');
      process.exit(0);
    } catch (err) {
      console.error('Failed to seed database:', err);
      process.exit(1);
    }
  })();
}

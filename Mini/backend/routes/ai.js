import express from 'express';
import { getDbConnection } from '../database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper to query all reports and projects to build context
async function getReportsContext(weekId) {
  const db = await getDbConnection();
  
  let reportsQuery = `
    SELECT r.*, u.name as user_name, p.name as project_name
    FROM reports r
    JOIN users u ON r.user_id = u.id
    JOIN projects p ON r.project_id = p.id
    WHERE r.status = 'submitted'
  `;
  const params = [];
  if (weekId) {
    reportsQuery += ` AND r.week_identifier = ? `;
    params.push(weekId);
  }

  const reports = await db.all(reportsQuery, params);
  
  return reports.map(r => {
    let completed = [];
    let planned = [];
    try { completed = JSON.parse(r.tasks_completed); } catch(_) {}
    try { planned = JSON.parse(r.tasks_planned); } catch(_) {}
    
    return `
Team Member: ${r.user_name}
Project: ${r.project_name}
Week: ${r.week_identifier}
Hours worked: ${r.hours_worked || 'Not specified'}
Completed Tasks:
${completed.map(t => `- ${t}`).join('\n') || '- None'}
Planned Tasks:
${planned.map(t => `- ${t}`).join('\n') || '- None'}
Blockers / Challenges: ${r.blockers || 'None'}
Notes: ${r.notes || 'None'}
--------------------------------------------------`;
  }).join('\n');
}

// AI Chat endpoint
router.post('/chat', authMiddleware, requireRole('manager'), async (req, res) => {
  const { message, history, week } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const useMock = process.env.USE_MOCK_AI === 'true' || !apiKey;

  try {
    const context = await getReportsContext(week);
    
    if (useMock) {
      // Run the Intelligent Mock Assistant
      const responseText = generateMockAIResponse(message, context, week);
      return res.json({ response: responseText });
    }

    // Call real Gemini API using fetch
    const responseText = await callGeminiAPI(apiKey, message, history || [], context);
    return res.json({ response: responseText });

  } catch (err) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ error: 'Failed to process AI chat assistant request.' });
  }
});

// Call Google Gemini API
async function callGeminiAPI(apiKey, message, history, context) {
  // Use gemini-2.5-flash as default, or fallback to gemini-1.5-flash if needed
  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Format context and history for Gemini structure
  const systemInstruction = `You are a helpful AI Team Lead Assistant.
You have access to the weekly reports of the team members. 
Analyze the report details provided below to answer the manager's query.
Be concise, professional, and clear. Format your responses in markdown (use bullet points, bold text).
If the reports context does not contain relevant information, state that clearly.

--- REPORTS CONTEXT ---
${context}
----------------------`;

  // Build API contents payload
  // We can include systemInstruction in the prompt itself or system_instruction API field
  const prompt = `${systemInstruction}\n\nUser Query: ${message}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Invalid response structure from Gemini API.');
  }

  return text;
}

// Generate Intelligent Mock AI Response based on DB scan
function generateMockAIResponse(query, context, week) {
  const q = query.toLowerCase();

  // If reports context is empty
  if (!context || context.trim() === '') {
    return `No reports have been submitted yet for this week (${week || 'all weeks'}). I can't generate a summary without report data.`;
  }

  // Parse reports in JavaScript to answer queries
  const reportsList = [];
  const reportsBlocks = context.split('--------------------------------------------------');
  
  reportsBlocks.forEach(block => {
    if (!block.trim()) return;
    const lines = block.trim().split('\n');
    let member = '';
    let project = '';
    let weekId = '';
    let blockers = '';
    let hours = '';
    const completed = [];
    const planned = [];
    
    let mode = ''; // 'completed' or 'planned'

    lines.forEach(line => {
      if (line.startsWith('Team Member:')) member = line.replace('Team Member:', '').trim();
      else if (line.startsWith('Project:')) project = line.replace('Project:', '').trim();
      else if (line.startsWith('Week:')) weekId = line.replace('Week:', '').trim();
      else if (line.startsWith('Hours worked:')) hours = line.replace('Hours worked:', '').trim();
      else if (line.startsWith('Blockers / Challenges:')) blockers = line.replace('Blockers / Challenges:', '').trim();
      else if (line.startsWith('Completed Tasks:')) {
        mode = 'completed';
      } else if (line.startsWith('Planned Tasks:')) {
        mode = 'planned';
      } else if (line.startsWith('Notes:')) {
        mode = '';
      } else if (line.startsWith('- ') && mode === 'completed') {
        completed.push(line.replace('- ', '').trim());
      } else if (line.startsWith('- ') && mode === 'planned') {
        planned.push(line.replace('- ', '').trim());
      }
    });

    reportsList.push({ member, project, week: weekId, blockers, hours, completed, planned });
  });

  // 1. Summary/Overview Request
  if (q.includes('summary') || q.includes('summarize') || q.includes('overview') || q.includes('workload')) {
    let summary = `### 📊 AI Weekly Team Summary (${week || 'All Data'})\n\n`;
    
    // Core Achievements
    summary += `**Key Accomplishments:**\n`;
    reportsList.forEach(r => {
      if (r.completed.length > 0) {
        summary += `- **${r.member}** (${r.project}): ${r.completed[0]}${r.completed[1] ? ` & ${r.completed[1].toLowerCase()}` : ''}\n`;
      }
    });

    // Blockers
    const activeBlockers = reportsList.filter(r => r.blockers && r.blockers.toLowerCase() !== 'none');
    if (activeBlockers.length > 0) {
      summary += `\n**⚠️ Active Blockers:**\n`;
      activeBlockers.forEach(r => {
        summary += `- **${r.member}** is blocked by: *"${r.blockers}"*\n`;
      });
    } else {
      summary += `\n**✨ Blockers:** No team members reported active blockers.\n`;
    }

    // Workload/Hours distribution
    summary += `\n**⏱️ Workload Distribution:**\n`;
    reportsList.forEach(r => {
      summary += `- **${r.member}**: logged **${r.hours} hours** on *${r.project}*\n`;
    });

    return summary;
  }

  // 2. Blockers Request
  if (q.includes('blocker') || q.includes('obstacle') || q.includes('stuck') || q.includes('challenge')) {
    const activeBlockers = reportsList.filter(r => r.blockers && r.blockers.toLowerCase() !== 'none');
    if (activeBlockers.length === 0) {
      return `### 🟢 Blockers Update\n\nAll team members are running smoothly! No blockers or obstacles have been reported for the selected week.`;
    }

    let reply = `### ⚠️ Active Team Blockers (${week || 'All'})\n\nHere are the active challenges preventing progress:\n\n`;
    activeBlockers.forEach(r => {
      reply += `- **${r.member}** working on **${r.project}**:\n  > *"${r.blockers}"*\n`;
    });
    return reply;
  }

  // 3. Member Specific Request (Bob, Charlie, Dave)
  for (let r of reportsList) {
    const nameKey = r.member.split(' ')[0].toLowerCase(); // e.g. "bob"
    if (q.includes(nameKey)) {
      return `### 👤 Activity Report: ${r.member}\n\n` +
             `* **Project:** ${r.project}\n` +
             `* **Hours Worked:** ${r.hours} hours\n` +
             `* **Blockers:** *${r.blockers}*\n\n` +
             `**Completed Tasks:**\n` +
             r.completed.map(t => `- ${t}`).join('\n') + `\n\n` +
             `**Planned Next Week:**\n` +
             r.planned.map(t => `- ${t}`).join('\n');
    }
  }

  // 4. Project Specific Request (Client A, Website, internal, r&d)
  for (let r of reportsList) {
    const projKey = r.project.toLowerCase();
    if (q.includes(projKey) || q.includes(projKey.split(' ')[0])) {
      const matchReports = reportsList.filter(rep => rep.project.toLowerCase().includes(projKey.split(' ')[0]));
      let reply = `### 📁 Project Focus: ${r.project}\n\n`;
      matchReports.forEach(rep => {
        reply += `**${rep.member}** logged **${rep.hours} hours**:\n` +
                 `* **Completed:** ${rep.completed.join(', ')}\n` +
                 `* **Blocker:** *${rep.blockers}*\n\n`;
      });
      return reply;
    }
  }

  // Fallback default response
  return `### 🤖 Assistant Response\n\n` +
         `I parsed the team reports database. I see **${reportsList.length} report(s)** submitted. \n\n` +
         `You can ask me questions like:\n` +
         `- *"Summarize the team's progress this week"* (gives an overview of accomplishments, blockers, and workload)\n` +
         `- *"What are the current blockers?"* (lists all active blocking factors)\n` +
         `- *"What did Bob work on?"* (gives a profile of Bob's tasks)\n\n` +
         `Current query context contains reports for: ${reportsList.map(r => r.member).join(', ')}.`;
}

export default router;

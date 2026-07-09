import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, Trash2, FileText, CheckCircle2, Loader2, Clock, ArrowRight } from 'lucide-react';

// Week helpers
function getWeekRange(weekStr) {
  const parts = weekStr.split('-W');
  if (parts.length !== 2) return '';
  const year = parseInt(parts[0]);
  const weekNum = parseInt(parts[1]);
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay();
  const offset = jan1Day <= 4 ? 1 - jan1Day : 8 - jan1Day;
  const startDay = new Date(year, 0, 1 + offset + (weekNum - 1) * 7);
  const endDay = new Date(startDay.getTime() + 6 * 24 * 60 * 60 * 1000);
  const options = { month: 'short', day: 'numeric' };
  return `${startDay.toLocaleDateString('en-US', options)} – ${endDay.toLocaleDateString('en-US', options)}, ${year}`;
}

function generateWeeksList() {
  const list = [];
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
  let currentWeek = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  let currentYear = now.getFullYear();
  for (let i = 0; i < 5; i++) {
    let wNum = currentWeek - i;
    let yNum = currentYear;
    if (wNum <= 0) { yNum -= 1; wNum = 52 + wNum; }
    const wStr = `${yNum}-W${String(wNum).padStart(2, '0')}`;
    list.push({ value: wStr, label: `${wStr}  ·  ${getWeekRange(wStr)}` });
  }
  return list;
}

/* Skeleton loader row */
function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
      <div className="skeleton skeleton-text" style={{ width: '40%' }} />
    </div>
  );
}

export default function MemberDashboard() {
  const { getAuthHeaders, API_URL, user } = useAuth();
  const weeks = generateWeeksList();

  const [selectedWeek, setSelectedWeek] = useState(weeks[0].value);
  const [projectId, setProjectId] = useState('');
  const [tasksCompleted, setTasksCompleted] = useState(['']);
  const [tasksPlanned, setTasksPlanned] = useState(['']);
  const [blockers, setBlockers] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [notes, setNotes] = useState('');
  const [reportId, setReportId] = useState(null);
  const [reportStatus, setReportStatus] = useState(null); // 'submitted' | 'draft' | null

  const [projects, setProjects] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchData = async () => {
    try {
      const headers = getAuthHeaders();
      const projRes = await fetch(`${API_URL}/projects`, { headers });
      const projData = await projRes.json();
      setProjects(projData.projects || []);
      if (projData.projects?.length > 0 && !projectId) {
        setProjectId(projData.projects[0].id.toString());
      }
      const histRes = await fetch(`${API_URL}/reports/my-history`, { headers });
      const histData = await histRes.json();
      setHistory(histData.reports || []);
    } catch (err) {
      showMsg('Failed to load dashboard data.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (history.length > 0 && projectId && selectedWeek) {
      const match = history.find(r => r.week_identifier === selectedWeek && r.project_id.toString() === projectId.toString());
      if (match) {
        setReportId(match.id);
        setReportStatus(match.status);
        setTasksCompleted(match.tasks_completed.length > 0 ? match.tasks_completed : ['']);
        setTasksPlanned(match.tasks_planned.length > 0 ? match.tasks_planned : ['']);
        setBlockers(match.blockers || '');
        setHoursWorked(match.hours_worked !== null ? match.hours_worked.toString() : '');
        setNotes(match.notes || '');
      } else {
        setReportId(null);
        setReportStatus(null);
        setTasksCompleted(['']);
        setTasksPlanned(['']);
        setBlockers('');
        setHoursWorked('');
        setNotes('');
      }
    }
  }, [selectedWeek, projectId, history]);

  const showMsg = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleTaskChange = (index, value, type) => {
    if (type === 'completed') {
      const n = [...tasksCompleted]; n[index] = value; setTasksCompleted(n);
    } else {
      const n = [...tasksPlanned]; n[index] = value; setTasksPlanned(n);
    }
  };

  const addTaskRow = (type) => {
    if (type === 'completed') setTasksCompleted([...tasksCompleted, '']);
    else setTasksPlanned([...tasksPlanned, '']);
  };

  const removeTaskRow = (index, type) => {
    if (type === 'completed') {
      if (tasksCompleted.length === 1) return;
      setTasksCompleted(tasksCompleted.filter((_, i) => i !== index));
    } else {
      if (tasksPlanned.length === 1) return;
      setTasksPlanned(tasksPlanned.filter((_, i) => i !== index));
    }
  };

  const handleSaveReport = async (status) => {
    if (!projectId) { showMsg('Please select a project.', 'danger'); return; }
    const finalCompleted = tasksCompleted.filter(t => t.trim() !== '');
    const finalPlanned = tasksPlanned.filter(t => t.trim() !== '');
    if (status === 'submitted' && (finalCompleted.length === 0 || finalPlanned.length === 0)) {
      showMsg('Add at least one completed task and one planned task to submit.', 'danger');
      return;
    }
    const range = getWeekRange(selectedWeek);
    const startDate = range ? new Date(range.split(' – ')[0] + ', ' + selectedWeek.split('-W')[0]).toISOString().split('T')[0] : '';
    const endDate = range ? new Date(range.split(' – ')[1]).toISOString().split('T')[0] : '';

    setSubmitLoading(true);
    try {
      const res = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: reportId,
          project_id: parseInt(projectId),
          week_identifier: selectedWeek,
          start_date: startDate || new Date().toISOString().split('T')[0],
          end_date: endDate || new Date().toISOString().split('T')[0],
          tasks_completed: finalCompleted,
          tasks_planned: finalPlanned,
          blockers,
          hours_worked: hoursWorked,
          notes,
          status
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save report');
      showMsg(data.message, 'success');
      setReportStatus(status);
      const histRes = await fetch(`${API_URL}/reports/my-history`, { headers: getAuthHeaders() });
      const histData = await histRes.json();
      setHistory(histData.reports || []);
    } catch (err) {
      showMsg(err.message, 'danger');
    } finally {
      setSubmitLoading(false);
    }
  };

  const loadReportToEdit = (rep) => {
    setSelectedWeek(rep.week_identifier);
    setProjectId(rep.project_id.toString());
    setReportId(rep.id);
    setReportStatus(rep.status);
    setTasksCompleted(rep.tasks_completed.length > 0 ? rep.tasks_completed : ['']);
    setTasksPlanned(rep.tasks_planned.length > 0 ? rep.tasks_planned : ['']);
    setBlockers(rep.blockers || '');
    setHoursWorked(rep.hours_worked !== null ? rep.hours_worked.toString() : '');
    setNotes(rep.notes || '');
  };

  const clearForm = () => {
    setReportId(null);
    setReportStatus(null);
    setTasksCompleted(['']);
    setTasksPlanned(['']);
    setBlockers('');
    setHoursWorked('');
    setNotes('');
  };

  if (loading) {
    return (
      <div style={{ padding: '32px 0' }}>
        <div style={{ marginBottom: '32px' }}>
          <div className="skeleton skeleton-text" style={{ width: '120px', marginBottom: '10px' }} />
          <div className="skeleton skeleton-title" style={{ width: '260px', marginBottom: '10px' }} />
          <div className="skeleton skeleton-text" style={{ width: '220px' }} />
        </div>
        <div className="grid grid-3 gap-3">
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '32px 0' }}>

      {/* Header */}
      <div className="flex justify-between align-center flex-wrap gap-2" style={{ marginBottom: '28px' }}>
        <div>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Personal Portal
          </span>
          <h1 style={{ marginTop: '4px', marginBottom: '4px' }}>
            Welcome, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Create, manage, and submit your weekly reports.
          </p>
        </div>

        {/* Current week status pill */}
        {reportStatus ? (
          <div className={`status-pill status-pill--${reportStatus}`}>
            {reportStatus === 'submitted' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
            {selectedWeek}: {reportStatus === 'submitted' ? 'Submitted ✓' : 'Draft saved'}
          </div>
        ) : (
          <div className="status-pill status-pill--none">
            <FileText size={14} />
            {selectedWeek}: No report yet
          </div>
        )}
      </div>

      {/* Message Alert */}
      {message.text && (
        <div
          className={`alert alert-${message.type}`}
          style={{ marginBottom: '20px' }}
        >
          {message.type === 'success' ? <CheckCircle2 size={16} className="alert-icon" /> : <FileText size={16} className="alert-icon" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-3 gap-3">

        {/* Left: Report Form */}
        <div className="card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0' }}>

          {/* Form Header */}
          <div className="flex align-center gap-2" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '16px', marginBottom: '20px' }}>
            <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.3rem' }}>{reportId ? 'Edit Report' : 'New Weekly Report'}</h2>
            {reportId && <span className="badge badge-accent" style={{ marginLeft: 'auto' }}>Editing</span>}
          </div>

          {/* ── Step 1: Week & Project ── */}
          <div style={{ marginBottom: '24px' }}>
            <h4 className="form-section-title">
              <span className="step-number">1</span>
              Select Week &amp; Project
            </h4>
            <div className="grid grid-2 gap-2">
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" htmlFor="week-select">Week</label>
                <select
                  id="week-select"
                  className="input-field"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                >
                  {weeks.map(w => (
                    <option key={w.value} value={w.value} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" htmlFor="project-select">Project</label>
                <select
                  id="project-select"
                  className="input-field"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  {projects.length === 0
                    ? <option value="">No projects available</option>
                    : projects.map(p => (
                      <option key={p.id} value={p.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        {p.name}
                      </option>
                    ))
                  }
                </select>
              </div>
            </div>
          </div>

          {/* ── Step 2: Tasks Completed ── */}
          <div style={{ marginBottom: '24px' }}>
            <h4 className="form-section-title">
              <span className="step-number">2</span>
              Tasks Completed This Week
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tasksCompleted.map((task, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., Connected backend APIs to login interface"
                    value={task}
                    onChange={(e) => handleTaskChange(idx, e.target.value, 'completed')}
                    style={{ marginBottom: 0 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeTaskRow(idx, 'completed')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '4px', flexShrink: 0, display: 'flex', transition: 'color 0.15s' }}
                    disabled={tasksCompleted.length === 1}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button type="button" className="btn-dashed" onClick={() => addTaskRow('completed')} style={{ marginTop: '4px' }}>
                <Plus size={14} /> Add completed task
              </button>
            </div>
          </div>

          {/* ── Step 3: Tasks Planned ── */}
          <div style={{ marginBottom: '24px' }}>
            <h4 className="form-section-title">
              <span className="step-number">3</span>
              Planned for Next Week
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tasksPlanned.map((task, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <ArrowRight size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., Build dashboard tables and filter controls"
                    value={task}
                    onChange={(e) => handleTaskChange(idx, e.target.value, 'planned')}
                    style={{ marginBottom: 0 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeTaskRow(idx, 'planned')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '4px', flexShrink: 0, display: 'flex', transition: 'color 0.15s' }}
                    disabled={tasksPlanned.length === 1}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button type="button" className="btn-dashed" onClick={() => addTaskRow('planned')} style={{ marginTop: '4px' }}>
                <Plus size={14} /> Add planned task
              </button>
            </div>
          </div>

          {/* ── Step 4: Blockers & Extras ── */}
          <div style={{ marginBottom: '20px' }}>
            <h4 className="form-section-title">
              <span className="step-number">4</span>
              Blockers &amp; Additional Info
            </h4>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label" htmlFor="blockers-input">Blockers / Challenges</label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{blockers.length}/400</span>
              </div>
              <textarea
                id="blockers-input"
                className="input-field"
                rows={3}
                placeholder="e.g., API latency on mock server. (Write 'None' if no blockers)"
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                style={{ resize: 'vertical', maxLength: 400 }}
                maxLength={400}
              />
            </div>

            <div className="grid grid-2 gap-2">
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" htmlFor="hours-input">Hours Worked (Optional)</label>
                <input
                  id="hours-input"
                  type="number"
                  step="0.5"
                  min="0"
                  max="168"
                  className="input-field"
                  placeholder="e.g., 37.5"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" htmlFor="notes-input">Notes / Links (Optional)</label>
                <input
                  id="notes-input"
                  type="text"
                  className="input-field"
                  placeholder="e.g., https://github.com/pr/123"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: '1px solid var(--card-border)', paddingTop: '20px', marginTop: '4px'
          }}>
            <div>
              {reportId && (
                <button type="button" className="btn btn-ghost" onClick={clearForm} disabled={submitLoading}>
                  Clear form
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleSaveReport('draft')}
                disabled={submitLoading}
                style={{ minWidth: '120px' }}
              >
                {submitLoading ? 'Saving…' : '💾 Save Draft'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSaveReport('submitted')}
                disabled={submitLoading}
                style={{ minWidth: '150px' }}
              >
                {submitLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Loader2 size={15} className="animate-spin" /> Submitting…
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={15} /> Submit Report
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Report History */}
        <div className="card" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '0', maxHeight: '740px', overflowY: 'auto' }}>
          <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '14px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem' }}>Report History</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '3px' }}>Click any entry to load it into the editor.</p>
          </div>

          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Calendar size={28} style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="empty-state-title">No reports yet</p>
              <p className="empty-state-desc">Submit your first weekly report using the form on the left.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.map((rep) => (
                <div
                  key={rep.id}
                  className="card card-hover"
                  onClick={() => loadReportToEdit(rep)}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    background: reportId === rep.id ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                    borderColor: reportId === rep.id ? 'var(--accent-primary)' : 'var(--card-border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{rep.week_identifier}</span>
                    <span className={`badge ${rep.status === 'submitted' ? 'badge-success' : 'badge-warning'}`}>
                      {rep.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '2px' }}>{rep.project_name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {rep.hours_worked ? `${rep.hours_worked}h logged` : 'Hours not logged'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

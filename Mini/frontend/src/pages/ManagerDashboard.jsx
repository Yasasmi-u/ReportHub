import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Calendar, Users, AlertTriangle, FileText, CheckCircle, Clock, Search, Eye, Filter, Loader2, RefreshCw, TrendingUp, X } from 'lucide-react';

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

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

const avatarColors = [
  ['#6366f1','#8b5cf6'],['#10b981','#059669'],['#f59e0b','#d97706'],
  ['#06b6d4','#0891b2'],['#ef4444','#dc2626'],['#8b5cf6','#7c3aed'],
];
function getAvatarGradient(name = '') {
  const idx = name.charCodeAt(0) % avatarColors.length;
  const [a, b] = avatarColors[idx];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

/* Skeleton rows */
function SkeletonMetric() {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
      <div className="skeleton skeleton-circle" style={{ width: '56px', height: '56px', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton skeleton-text" style={{ width: '55%' }} />
        <div className="skeleton skeleton-title" style={{ width: '35%' }} />
      </div>
    </div>
  );
}

/* Custom chart tooltip */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--card-border)',
      borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-primary)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.value} {p.name === 'completedTasksCount' ? 'tasks' : 'hours'}
        </p>
      ))}
    </div>
  );
};

export default function ManagerDashboard() {
  const { getAuthHeaders, API_URL } = useAuth();
  const weeks = generateWeeksList();

  const [filterWeek, setFilterWeek] = useState(weeks[0].value);
  const [filterMember, setFilterMember] = useState('');
  const [filterProject, setFilterProject] = useState('');

  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({ totalMembers: 0, submittedCount: 0, openBlockers: 0, complianceRate: 0 });
  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState({ memberSubmissions: [], taskTrend: [], projectHours: [] });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [memRes, projRes, sumRes, repRes, anaRes] = await Promise.all([
        fetch(`${API_URL}/projects/team-members`, { headers }),
        fetch(`${API_URL}/projects`, { headers }),
        fetch(`${API_URL}/reports/manager/summary?week=${filterWeek}`, { headers }),
        fetch(`${API_URL}/reports/manager/reports?week=${filterWeek}${filterMember ? `&member=${filterMember}` : ''}${filterProject ? `&project=${filterProject}` : ''}`, { headers }),
        fetch(`${API_URL}/reports/manager/analytics?week=${filterWeek}`, { headers }),
      ]);
      const [memData, projData, sumData, repData, anaData] = await Promise.all([
        memRes.json(), projRes.json(), sumRes.json(), repRes.json(), anaRes.json()
      ]);
      setMembers(memData.members || []);
      setProjects(projData.projects || []);
      setSummary(sumData);
      setReports(repData.reports || []);
      setAnalytics(anaData);
    } catch (err) {
      console.error('Error fetching manager dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [filterWeek, filterMember, filterProject]);

  const compliancePct = summary.complianceRate || 0;
  const complianceColor = compliancePct >= 80 ? 'success' : compliancePct >= 50 ? 'warning' : 'danger';

  if (loading) {
    return (
      <div style={{ padding: '32px 0' }}>
        <div style={{ marginBottom: '32px' }}>
          <div className="skeleton skeleton-text" style={{ width: '100px', marginBottom: '10px' }} />
          <div className="skeleton skeleton-title" style={{ width: '300px', marginBottom: '10px' }} />
          <div className="skeleton skeleton-text" style={{ width: '260px' }} />
        </div>
        <div className="grid grid-3 gap-3" style={{ marginBottom: '28px' }}>
          <SkeletonMetric /><SkeletonMetric /><SkeletonMetric />
        </div>
        <div className="grid grid-2 gap-3">
          <div className="skeleton" style={{ height: '280px', borderRadius: '12px' }} />
          <div className="skeleton" style={{ height: '280px', borderRadius: '12px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '32px 0' }}>

      {/* ── Header ── */}
      <div className="flex justify-between align-center flex-wrap gap-2" style={{ marginBottom: '28px' }}>
        <div>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Manager View
          </span>
          <h1 style={{ marginTop: '4px', marginBottom: '4px' }}>Team Overview &amp; Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Analyze reports, track submissions, and resolve blockers.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => loadData(true)}
          disabled={refreshing}
          style={{ gap: '7px' }}
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '28px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
          <Filter size={15} />
          <span style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters</span>
        </div>

        {/* Week filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
          <label htmlFor="filter-week" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: 600 }}>Week</label>
          <select
            id="filter-week"
            className="input-field"
            value={filterWeek}
            onChange={(e) => setFilterWeek(e.target.value)}
            style={{ padding: '7px 12px', fontSize: '0.85rem', marginBottom: 0 }}
          >
            {weeks.map(w => (
              <option key={w.value} value={w.value} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                {w.label}
              </option>
            ))}
          </select>
        </div>

        {/* Member filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px' }}>
          <label htmlFor="filter-member" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: 600 }}>Member</label>
          <select
            id="filter-member"
            className="input-field"
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            style={{ padding: '7px 12px', fontSize: '0.85rem', marginBottom: 0 }}
          >
            <option value="">All Members</option>
            {members.map(m => (
              <option key={m.id} value={m.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Project filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px' }}>
          <label htmlFor="filter-project" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: 600 }}>Project</label>
          <select
            id="filter-project"
            className="input-field"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            style={{ padding: '7px 12px', fontSize: '0.85rem', marginBottom: 0 }}
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Active filter chips */}
        {(filterMember || filterProject) && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {filterMember && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)',
                border: '1px solid rgba(99,102,241,0.25)', borderRadius: '99px',
                padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600
              }}>
                {members.find(m => m.id.toString() === filterMember)?.name || 'Member'}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFilterMember('')} />
              </span>
            )}
            {filterProject && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'rgba(6,182,212,0.1)', color: 'var(--info)',
                border: '1px solid rgba(6,182,212,0.25)', borderRadius: '99px',
                padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600
              }}>
                {projects.find(p => p.id.toString() === filterProject)?.name || 'Project'}
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFilterProject('')} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-3 gap-3" style={{ marginBottom: '28px' }}>

        {/* Compliance */}
        <div className="card stat-card stat-card--success animate-count-up" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '14px', background: 'var(--success-glow)', color: 'var(--success)', borderRadius: 'var(--border-radius-md)', display: 'flex' }}>
              <CheckCircle size={26} />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500, marginBottom: '2px' }}>Submission Rate</p>
              <h2 style={{ fontSize: '2.2rem', lineHeight: 1, color: compliancePct >= 80 ? 'var(--success)' : compliancePct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                {compliancePct}%
              </h2>
            </div>
          </div>
          <div>
            <div className="progress-container">
              <div
                className={`progress-fill progress-fill--${complianceColor}`}
                style={{ width: `${compliancePct}%` }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              {summary.submittedCount} of {summary.totalMembers} members submitted
            </p>
          </div>
        </div>

        {/* Reports Filed */}
        <div className="card stat-card stat-card--accent animate-count-up" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '14px', background: 'var(--accent-glow)', color: 'var(--accent-primary)', borderRadius: 'var(--border-radius-md)', display: 'flex' }}>
            <FileText size={26} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500, marginBottom: '2px' }}>Reports Filed</p>
            <h2 style={{ fontSize: '2.2rem', lineHeight: 1 }}>{reports.length}</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Matching active filters
            </p>
          </div>
        </div>

        {/* Blockers */}
        <div className="card stat-card stat-card--warning animate-count-up" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '14px', background: 'var(--warning-glow)', color: 'var(--warning)', borderRadius: 'var(--border-radius-md)', display: 'flex' }}>
            <AlertTriangle size={26} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500, marginBottom: '2px' }}>Active Blockers</p>
            <h2 style={{ fontSize: '2.2rem', lineHeight: 1, color: summary.openBlockers > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
              {summary.openBlockers}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {summary.openBlockers > 0 ? 'Needs attention' : 'All clear ✓'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-2 gap-3" style={{ marginBottom: '28px' }}>
        {/* Tasks Trend */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp size={16} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1rem' }}>Tasks Completed Trend</h3>
            <span className="badge badge-accent" style={{ marginLeft: 'auto' }}>Last 6 weeks</span>
          </div>
          <div style={{ width: '100%', height: '220px' }}>
            {analytics.taskTrend.length === 0 ? (
              <div className="empty-state" style={{ height: '100%', padding: '20px 0' }}>
                <p style={{ fontSize: '0.85rem' }}>No trend data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.taskTrend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="completedTasksCount"
                    stroke="var(--accent-primary)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: 'var(--accent-primary)', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#fff', stroke: 'var(--accent-primary)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Hours by Project */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock size={16} style={{ color: 'var(--accent-secondary)' }} />
            <h3 style={{ fontSize: '1rem' }}>Workload by Project</h3>
            <span className="badge badge-accent" style={{ marginLeft: 'auto' }}>Hours logged</span>
          </div>
          <div style={{ width: '100%', height: '220px' }}>
            {analytics.projectHours.length === 0 ? (
              <div className="empty-state" style={{ height: '100%', padding: '20px 0' }}>
                <p style={{ fontSize: '0.85rem' }}>No hours logged this week</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.projectHours} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="projectName" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalHours" fill="url(#barGrad)" radius={[5, 5, 0, 0]} />
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Team Compliance + Reports Feed ── */}
      <div className="grid grid-3 gap-3">

        {/* Compliance Status List */}
        <div className="card" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Team Compliance</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '3px' }}>
              {filterWeek} submission status
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px', overflowY: 'auto' }}>
            {analytics.memberSubmissions.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <p style={{ fontSize: '0.85rem' }}>No members found</p>
              </div>
            ) : analytics.memberSubmissions.map((sub) => (
              <div
                key={sub.userId}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--card-border)',
                  transition: 'background 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    className="avatar avatar--sm"
                    style={{ background: getAvatarGradient(sub.name) }}
                  >
                    {getInitials(sub.name)}
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{sub.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span className={`status-dot status-dot--${sub.status === 'submitted' ? 'success' : sub.status === 'draft' ? 'warning' : 'danger'}`} />
                  <span className={`badge ${sub.status === 'submitted' ? 'badge-success' : sub.status === 'draft' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                    {sub.status || 'none'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reports Feed */}
        <div className="card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Reports Feed</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '3px' }}>
              Submitted reports matching active filters.
            </p>
          </div>

          {reports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Search size={26} style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="empty-state-title">No reports found</p>
              <p className="empty-state-desc">Try adjusting your filters or check back after submissions.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '460px', overflowY: 'auto' }}>
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="card card-hover"
                  style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)' }}
                >
                  <div className="flex justify-between align-center flex-wrap gap-1" style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar avatar--md" style={{ background: getAvatarGradient(rep.user_name) }}>
                        {getInitials(rep.user_name)}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.2 }}>{rep.user_name}</h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 500 }}>{rep.project_name}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-accent">{rep.week_identifier}</span>
                      {rep.hours_worked && (
                        <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={10} /> {rep.hours_worked}h
                        </span>
                      )}
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedReport(rep)}
                        style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '5px' }}
                      >
                        <Eye size={13} /> View
                      </button>
                    </div>
                  </div>

                  {/* Task preview */}
                  <div style={{ borderTop: '1px dashed var(--card-border)', paddingTop: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Completed tasks:
                    </p>
                    <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {rep.tasks_completed.slice(0, 2).map((task, i) => <li key={i}>{task}</li>)}
                      {rep.tasks_completed.length > 2 && (
                        <li style={{ color: 'var(--accent-primary)', listStyle: 'none', fontStyle: 'italic' }}>
                          +{rep.tasks_completed.length - 2} more
                        </li>
                      )}
                    </ul>
                  </div>

                  {rep.blockers && rep.blockers.toLowerCase() !== 'none' && (
                    <div className="alert alert-warning" style={{ marginTop: '10px', padding: '8px 12px', fontSize: '0.8rem' }}>
                      <AlertTriangle size={13} className="alert-icon" />
                      <span><strong>Blocker:</strong> {rep.blockers}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Report Detail Modal ── */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>

            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--card-border)', paddingBottom: '16px', marginBottom: '22px', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="avatar avatar--lg" style={{ background: getAvatarGradient(selectedReport.user_name) }}>
                  {getInitials(selectedReport.user_name)}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.4rem', marginBottom: '3px' }}>Weekly Report</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                    {selectedReport.user_name} · {selectedReport.user_email}
                  </p>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setSelectedReport(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Metadata */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'none', padding: '5px 12px' }}>
                <Calendar size={12} /> {selectedReport.week_identifier} · {getWeekRange(selectedReport.week_identifier)}
              </span>
              <span className="badge badge-success" style={{ textTransform: 'none', padding: '5px 12px' }}>
                {selectedReport.project_name}
              </span>
              {selectedReport.hours_worked && (
                <span className="badge badge-accent" style={{ display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'none', padding: '5px 12px' }}>
                  <Clock size={12} /> {selectedReport.hours_worked}h worked
                </span>
              )}
            </div>

            {/* Tasks Completed */}
            <div style={{ marginBottom: '20px' }}>
              <h4 className="form-section-title">
                <CheckCircle size={13} /> Tasks Completed This Week
              </h4>
              <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {selectedReport.tasks_completed.map((task, i) => (
                  <li key={i} style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{task}</li>
                ))}
              </ul>
            </div>

            {/* Tasks Planned */}
            <div style={{ marginBottom: '20px' }}>
              <h4 className="form-section-title">
                <Calendar size={13} /> Planned for Next Week
              </h4>
              <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {selectedReport.tasks_planned.map((task, i) => (
                  <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{task}</li>
                ))}
              </ul>
            </div>

            {/* Blockers */}
            <div style={{ marginBottom: '20px' }}>
              <h4 className="form-section-title">
                <AlertTriangle size={13} /> Blockers &amp; Challenges
              </h4>
              {selectedReport.blockers && selectedReport.blockers.toLowerCase() !== 'none' ? (
                <div className="alert alert-danger">
                  <AlertTriangle size={16} className="alert-icon" />
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: '4px' }}>Active Blocker</p>
                    <p style={{ fontSize: '0.9rem' }}>{selectedReport.blockers}</p>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No active blockers reported. ✓</p>
              )}
            </div>

            {/* Notes */}
            {selectedReport.notes && (
              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: '6px' }}>Notes / Links</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {selectedReport.notes.startsWith('http') ? (
                    <a href={selectedReport.notes} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                      {selectedReport.notes}
                    </a>
                  ) : selectedReport.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

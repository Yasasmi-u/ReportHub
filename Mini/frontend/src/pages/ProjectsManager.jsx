import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit2, Users, FolderKanban, CheckCircle, AlertTriangle, Loader2, X } from 'lucide-react';

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

export default function ProjectsManager() {
  const { getAuthHeaders, API_URL } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [editingProject, setEditingProject] = useState(null);

  const [assigningProject, setAssigningProject] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const [message, setMessage] = useState({ text: '', type: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProjects = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_URL}/projects`, { headers });
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      showMsg('Failed to load projects.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_URL}/projects/team-members`, { headers });
      const data = await res.json();
      setAllMembers(data.members || []);
    } catch (err) { console.error('Error fetching members:', err); }
  };

  useEffect(() => { fetchProjects(); fetchMembers(); }, []);

  const showMsg = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleCreateOrUpdateProject = async (e) => {
    e.preventDefault();
    if (!projectName) { showMsg('Project name is required.', 'danger'); return; }
    setActionLoading(true);
    try {
      const method = editingProject ? 'PUT' : 'POST';
      const url = editingProject ? `${API_URL}/projects/${editingProject.id}` : `${API_URL}/projects`;
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: projectName, description: projectDescription })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      showMsg(data.message || 'Project saved successfully.', 'success');
      setProjectName('');
      setProjectDescription('');
      setEditingProject(null);
      fetchProjects();
    } catch (err) {
      showMsg(err.message, 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (proj) => {
    setEditingProject(proj);
    setProjectName(proj.name);
    setProjectDescription(proj.description || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Delete this project? All attached reports will also be permanently removed.')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete project');
      showMsg('Project deleted successfully.', 'success');
      fetchProjects();
    } catch (err) {
      showMsg(err.message, 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignClick = (proj) => {
    setAssigningProject(proj);
    setSelectedMembers(proj.assignedUsers.map(u => u.id));
  };

  const handleCheckboxChange = (userId) => {
    if (selectedMembers.includes(userId)) setSelectedMembers(selectedMembers.filter(id => id !== userId));
    else setSelectedMembers([...selectedMembers, userId]);
  };

  const handleSaveAssignments = async () => {
    if (!assigningProject) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/projects/${assigningProject.id}/assign`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userIds: selectedMembers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save assignments');
      showMsg('Team assignments updated successfully.', 'success');
      setAssigningProject(null);
      fetchProjects();
    } catch (err) {
      showMsg(err.message, 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px 0' }}>
        <div style={{ marginBottom: '32px' }}>
          <div className="skeleton skeleton-text" style={{ width: '130px', marginBottom: '10px' }} />
          <div className="skeleton skeleton-title" style={{ width: '280px', marginBottom: '10px' }} />
          <div className="skeleton skeleton-text" style={{ width: '220px' }} />
        </div>
        <div className="grid grid-3 gap-3">
          <div className="skeleton" style={{ height: '300px', borderRadius: '12px' }} />
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px' }} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '32px 0' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Portal Administration
        </span>
        <h1 style={{ marginTop: '4px', marginBottom: '4px' }}>Projects &amp; Categories</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Create projects, manage descriptions, and assign team members.
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px' }}>
          {message.type === 'success' ? <CheckCircle size={16} className="alert-icon" /> : <AlertTriangle size={16} className="alert-icon" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-3 gap-3">

        {/* ── Create / Edit Form ── */}
        <div className="card" style={{ gridColumn: 'span 1', height: 'fit-content', position: 'sticky', top: '80px' }}>
          <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '14px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              {editingProject ? <Edit2 size={16} style={{ color: 'var(--warning)' }} /> : <Plus size={16} style={{ color: 'var(--accent-primary)' }} />}
              <h2 style={{ fontSize: '1.2rem' }}>{editingProject ? 'Edit Project' : 'New Project'}</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              {editingProject ? `Editing: ${editingProject.name}` : 'Define a project or category for weekly reports.'}
            </p>
          </div>

          <form onSubmit={handleCreateOrUpdateProject}>
            <div className="input-group">
              <label className="input-label" htmlFor="proj-name">Project Name *</label>
              <input
                id="proj-name"
                type="text"
                className="input-field"
                placeholder="e.g., Client Portal v2"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={actionLoading}
              />
            </div>

            <div className="input-group" style={{ marginBottom: '22px' }}>
              <label className="input-label" htmlFor="proj-desc">Description <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <textarea
                id="proj-desc"
                className="input-field"
                rows={4}
                placeholder="Brief overview of project goals and scope."
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                style={{ resize: 'vertical' }}
                disabled={actionLoading}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {editingProject && (
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={() => { setEditingProject(null); setProjectName(''); setProjectDescription(''); }}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
              )}
              <button type="submit" className="btn btn-primary flex-1" disabled={actionLoading}>
                {actionLoading
                  ? <Loader2 size={15} className="animate-spin" />
                  : editingProject ? 'Save Changes' : <><Plus size={15} /> Create Project</>
                }
              </button>
            </div>
          </form>
        </div>

        {/* ── Project List ── */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <FolderKanban size={18} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.2rem' }}>Active Projects</h2>
            <span className="badge badge-accent" style={{ marginLeft: '4px' }}>{projects.length}</span>
          </div>

          {projects.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <FolderKanban size={28} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="empty-state-title">No projects yet</p>
                <p className="empty-state-desc">Use the form on the left to create your first project or category.</p>
              </div>
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj.id}
                className="card card-hover"
                style={{
                  padding: '18px 20px',
                  background: editingProject?.id === proj.id ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.01)',
                  borderColor: editingProject?.id === proj.id ? 'rgba(245,158,11,0.3)' : 'var(--card-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px' }}>{proj.name}</h3>
                    <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {proj.description || 'No description provided.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleAssignClick(proj)}
                      style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '5px' }}
                    >
                      <Users size={13} /> Assign Team
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleEditClick(proj)}
                      style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '5px' }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleDeleteProject(proj.id)}
                      style={{ padding: '6px 10px', fontSize: '0.78rem', color: 'var(--danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Assigned Members */}
                <div style={{ borderTop: '1px dashed var(--card-border)', paddingTop: '10px' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                    Assigned Team ({proj.assignedUsers.length})
                  </p>
                  {proj.assignedUsers.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No members assigned — click "Assign Team" to add members.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {proj.assignedUsers.slice(0, 6).map(u => (
                        <div
                          key={u.id}
                          className="avatar avatar--sm"
                          style={{ background: getAvatarGradient(u.name) }}
                          title={u.name}
                        >
                          {getInitials(u.name)}
                        </div>
                      ))}
                      {proj.assignedUsers.length > 6 && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          +{proj.assignedUsers.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Assign Members Modal ── */}
      {assigningProject && (
        <div className="modal-overlay" onClick={() => setAssigningProject(null)}>
          <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '14px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '3px' }}>Assign Team</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Select members for <strong>{assigningProject.name}</strong>
                </p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setAssigningProject(null)}>
                <X size={18} />
              </button>
            </div>

            {allMembers.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div className="empty-state-icon"><Users size={24} style={{ color: 'var(--text-muted)' }} /></div>
                <p className="empty-state-title">No members registered</p>
                <p className="empty-state-desc">Ask team members to register an account first.</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  {selectedMembers.length} of {allMembers.length} selected
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto', marginBottom: '20px' }}>
                  {allMembers.map((member) => {
                    const checked = selectedMembers.includes(member.id);
                    return (
                      <label
                        key={member.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '11px 14px',
                          background: checked ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.02)',
                          border: `1.5px solid ${checked ? 'rgba(99,102,241,0.3)' : 'var(--card-border)'}`,
                          borderRadius: 'var(--border-radius-sm)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleCheckboxChange(member.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                        />
                        <div className="avatar avatar--sm" style={{ background: getAvatarGradient(member.name) }}>
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2 }}>{member.name}</p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{member.email}</p>
                        </div>
                        {checked && (
                          <CheckCircle size={16} style={{ color: 'var(--accent-primary)', marginLeft: 'auto', flexShrink: 0 }} />
                        )}
                      </label>
                    );
                  })}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--card-border)', paddingTop: '14px' }}>
              <button className="btn btn-ghost" onClick={() => setAssigningProject(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveAssignments}
                disabled={actionLoading}
                style={{ minWidth: '140px' }}
              >
                {actionLoading
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : <><CheckCircle size={14} /> Save Assignments</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, Bell, CalendarDays, Check, ChevronDown,
  CircleCheckBig, CircleDashed, CircleDot, CircleHelp, Clock3, Filter,
  FolderKanban, Gauge, LoaderCircle, MoreHorizontal, Plus, RefreshCw,
  Sparkles, Trash2, Users, Zap, Building2
} from 'lucide-react';

export const members = [
  { name: 'Maitri More', role: 'Project lead', initials: 'MM', color: '#c8c2ff' },
  { name: 'Aarav Rao', role: 'Developer', initials: 'AR', color: '#b8e6c5' },
  { name: 'Ishita Shah', role: 'Designer', initials: 'IS', color: '#ffd7a8' },
  { name: 'Kabir Bansal', role: 'ML engineer', initials: 'KB', color: '#ffc4d7' }
];

export const statusMeta = {
  todo: { label: 'To do', icon: CircleDashed },
  progress: { label: 'In progress', icon: CircleDot },
  done: { label: 'Done', icon: CircleCheckBig }
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function formatDate(value) {
  if (!value) return 'No date';
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return 'No date';
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });
}

function projectDesc(tag) {
  return ({
    Research: 'Explore questions, gather evidence, and turn ideas into outcomes.',
    Engineering: 'Build, test, and improve a system together.',
    'AI / ML': 'Experiment, evaluate, and build intelligent tools.',
    Hackathon: 'Move from idea to prototype with your team.',
    'Student club': 'Coordinate people, plans, and shared initiatives.'
  })[tag] || 'A shared space to plan, build, and deliver your next idea.';
}

function Priority({ value = 'Medium' }) {
  const priority = ['Low', 'Medium', 'High'].includes(value) ? value : 'Medium';
  return <span className={`priority priority-${priority.toLowerCase()}`}><i />{priority}</span>;
}

function Status({ value = 'todo' }) {
  const meta = statusMeta[value] || statusMeta.todo;
  const Icon = meta.icon;
  return <span className={`status-pill ${value}`}><Icon size={12} />{meta.label}</span>;
}

function StatCard({ label, value, note, icon: Icon, tone = 'purple' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><div className="empty-state-icon"><Sparkles size={19} /></div><b>{title}</b><p>{text}</p></div>;
}

function ActivityItem({ item }) {
  const Icon = item.color === 'green' ? Check : item.color === 'orange' ? Sparkles : Activity;
  return <div className="activity-item"><div className={`activity-mark ${item.color}`}><Icon size={13} /></div><div><p>{item.text}</p><span>{item.time}</span></div></div>;
}

export function Overview({ projects, tasks, done, activeTasks, overdue, activity, onMove, onPage, onNewTask }) {
  const completion = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const upcoming = [...tasks].filter(t => t.status !== 'done').sort((a, b) => {
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due.localeCompare(b.due);
  }).slice(0, 5);

  return (
    <>
      <div className="stats-grid">
        <StatCard label="Active projects" value={projects.length} note="Across your workspace" icon={FolderKanban} tone="purple" />
        <StatCard label="Open tasks" value={activeTasks} note="Ready for a next step" icon={CircleDot} tone="blue" />
        <StatCard label="Tasks completed" value={done} note={`${completion}% overall completion`} icon={CircleCheckBig} tone="green" />
        <StatCard label="Overdue tasks" value={overdue} note={overdue ? 'Needs your attention' : 'You’re on track'} icon={Clock3} tone="orange" />
      </div>

      <div className="overview-grid">
        <section className="panel projects-panel">
          <div className="panel-heading"><div><h2>Projects in motion</h2><p>A quick pulse on your team’s work</p></div><button className="text-button" onClick={() => onPage('projects')}>View all <ArrowUpRight size={14} /></button></div>
          <div className="project-list">
            {projects.slice(0, 4).map(project => {
              const related = tasks.filter(t => t.project === project.name);
              const completed = related.filter(t => t.status === 'done').length;
              const progress = related.length ? Math.round(completed / related.length * 100) : 0;
              return (
                <button className="project-row project-row-button" key={project.id} onClick={() => onPage('tasks')}>
                  <div className="project-symbol" style={{ background: project.color }}>{project.initials}</div>
                  <div className="project-info"><div className="project-title-row"><b>{project.name}</b><span className="project-tag">{project.tag}</span></div><div className="project-meta"><span>{related.length} tasks</span><span>·</span><span>{project.members} members</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div></div>
                  <div className="progress-number">{progress}%</div>
                </button>
              );
            })}
            {!projects.length && <EmptyState title="Your first project starts here" text="Create a project to organize your team's work." />}
          </div>
          <button className="add-project-row" onClick={() => onPage('projects')}><span><Plus size={15} /></span> Explore all projects</button>
        </section>

        <section className="panel completion-panel">
          <div className="panel-heading"><div><h2>Workspace health</h2><p>Little wins add up</p></div><Gauge size={19} className="muted-icon" /></div>
          <div className="completion-ring-wrap"><div className="completion-ring" style={{ '--progress': `${completion * 3.6}deg` }}><div className="ring-inner"><strong>{completion}%</strong><span>completed</span></div></div></div>
          <div className="health-legend">
            {[['Completed', done, 'dot-done'], ['In progress', tasks.filter(t => t.status === 'progress').length, 'dot-progress'], ['To do', tasks.filter(t => t.status === 'todo').length, 'dot-todo']].map(([label, value, dot]) => <div key={label}><span className={`legend-dot ${dot}`} /><span>{label}</span><b>{value}</b></div>)}
          </div>
          <div className="health-note"><Sparkles size={15} /><span>Keep momentum: finish one small task today.</span></div>
        </section>
      </div>

      <div className="lower-grid">
        <section className="panel tasks-panel">
          <div className="panel-heading"><div><h2>Coming up next</h2><p>Your next action items</p></div><button className="text-button" onClick={() => onPage('tasks')}>All tasks <ArrowUpRight size={14} /></button></div>
          <div className="table-wrap"><table className="task-table"><thead><tr><th>Task</th><th>Priority</th><th>Due date</th><th>Status</th></tr></thead><tbody>
            {upcoming.map(task => <tr key={task.id}><td><div className="task-cell"><button className="task-checkbox" onClick={() => onMove(task, 'done')} aria-label="Mark complete"><Check size={12} /></button><div><b>{task.title}</b><small>{task.project}</small></div></div></td><td><Priority value={task.priority} /></td><td><span className="date-text"><CalendarDays size={13} />{formatDate(task.due)}</span></td><td><Status value={task.status} /></td></tr>)}
          </tbody></table>{!upcoming.length && <EmptyState title="All caught up" text="Create a task to plan your next step." />}</div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading"><div><h2>Recent activity</h2><p>Good work is worth noticing</p></div><button className="text-button" onClick={() => onPage('activity')}>View all</button></div>
          <div className="activity-list">{activity.slice(0, 5).map((item, index) => <ActivityItem key={`${item.text}-${index}`} item={item} />)}</div>
          {!activity.length && <EmptyState title="No activity yet" text="Your project updates will appear here." />}
          <button className="activity-link" onClick={() => onPage('activity')}>See activity history <ArrowUpRight size={14} /></button>
        </section>
      </div>

      <section className="focus-banner">
        <div className="focus-art"><div className="focus-orbit orbit-one" /><div className="focus-orbit orbit-two" /><div className="focus-spark"><Zap size={21} fill="currentColor" /></div></div>
        <div className="focus-copy"><span className="focus-kicker">A LITTLE REMINDER</span><h2>Progress over perfection.</h2><p>Make the next step small enough to start, and clear enough to finish.</p></div>
        <button className="button focus-button" onClick={onNewTask}>Plan your next step <ArrowUpRight size={15} /></button>
      </section>
    </>
  );
}

export function Projects({ projects, tasks, onNew, onOpen, onDelete }) {
  const [openMenu, setOpenMenu] = useState(null);

  return (
    <>
      <div className="section-intro"><div><h2>All projects <span className="count-pill">{projects.length}</span></h2><p>Everything your team is working on, in one place.</p></div><button className="button button-primary" onClick={onNew}><Plus size={15} /> Create project</button></div>
      <div className="project-cards">
        {projects.map(project => {
          const list = tasks.filter(t => t.project === project.name);
          const complete = list.filter(t => t.status === 'done').length;
          const progress = list.length ? Math.round(complete / list.length * 100) : 0;
          return (
            <div className="project-card" key={project.id}>
              <div className="project-card-top"><div className="project-symbol large" style={{ background: project.color }}>{project.initials}</div><span className="project-tag">{project.tag}</span><div className="project-actions"><button className="project-actions-trigger" onClick={() => setOpenMenu(openMenu === project.id ? null : project.id)} aria-label={`Actions for ${project.name}`}><MoreHorizontal size={18} /></button>{openMenu === project.id && <div className="action-dropdown"><button onClick={() => { setOpenMenu(null); onOpen(project.name); }}><FolderKanban size={15} /> View tasks</button><button className="delete-action" onClick={() => { setOpenMenu(null); onDelete(project); }}><Trash2 size={15} /> Delete project</button></div>}</div></div>
              <button className="project-card-open" onClick={() => onOpen(project.name)}><h3>{project.name}</h3><p className="project-card-desc">{projectDesc(project.tag)}</p></button>
              <div className="project-card-stats"><span><Check size={14} /> {list.length} tasks</span><span><Users size={14} /> {project.members} members</span></div>
              <div className="card-progress-head"><span>Completion</span><b>{progress}%</b></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <div className="avatar-stack">{members.slice(0, Math.min(project.members, 4)).map(m => <span key={m.initials} className="mini-avatar" style={{ background: m.color }}>{m.initials}</span>)}</div>
            </div>
          );
        })}
        <button className="new-project-card" onClick={onNew}><span><Plus size={22} /></span><b>Start something new</b><small>Create a shared space for your next idea.</small></button>
      </div>
      {!projects.length && <EmptyState title="No projects yet" text="Create your first project to get started." />}
    </>
  );
}

export function Tasks({ tasks, projects, projectFilter, setProjectFilter, onMove, onNew, onDelete }) {
  const [openMenu, setOpenMenu] = useState(null);

  return (
    <>
      <div className="task-toolbar"><div className="filter-select"><Filter size={15} /><select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}><option>All projects</option>{projects.map(p => <option key={p.id}>{p.name}</option>)}</select><ChevronDown size={14} /></div><span className="task-count">{tasks.length} matching tasks</span><button className="button button-primary" onClick={onNew}><Plus size={15} /> New task</button></div>
      <div className="kanban">
        {['todo', 'progress', 'done'].map(status => {
          const meta = statusMeta[status];
          const Icon = meta.icon;
          const list = tasks.filter(t => t.status === status);
          return (
            <section className="kanban-column" key={status}>
              <div className="kanban-head"><div className={`status-icon ${status}`}><Icon size={15} /></div><b>{meta.label}</b><span className="column-count">{list.length}</span><button className="column-add" onClick={onNew} aria-label={`Add ${meta.label} task`}><Plus size={15} /></button></div>
              <div className="kanban-cards">
                {list.map(task => {
                  const project = projects.find(p => p.name === task.project);
                  const overdue = task.status !== 'done' && task.due && task.due < todayISO();
                  const nextStatus = status === 'todo' ? 'progress' : status === 'progress' ? 'done' : 'todo';
                  return (
                    <article className="kanban-card" key={task.id}>
                      <div className="kanban-card-top"><span className="project-mini-dot" style={{ background: project?.color || '#ddd' }} /><span className="kanban-project">{task.project}</span><div className="task-menu-wrap"><button className="card-more" onClick={() => setOpenMenu(openMenu === task.id ? null : task.id)} aria-label={`Actions for ${task.title}`}><MoreHorizontal size={17} /></button>{openMenu === task.id && <div className="action-dropdown task-actions-dropdown"><button onClick={() => { setOpenMenu(null); onMove(task, nextStatus); }}><ArrowUpRight size={15} /> {status === 'done' ? 'Reopen task' : 'Move to next stage'}</button><button className="delete-action" onClick={() => { setOpenMenu(null); onDelete(task); }}><Trash2 size={15} /> Delete task</button></div>}</div></div>
                      <h3>{task.title}</h3>
                      <div className="kanban-card-bottom"><Priority value={task.priority} /><span className="date-text"><CalendarDays size={12} /> {formatDate(task.due)}</span></div>
                      {overdue && <span className="task-overdue"><Clock3 size={12} /> Overdue</span>}
                      <div className="kanban-assignee"><span className="mini-avatar" style={{ background: members.find(m => m.initials === task.initials)?.color || '#d8d4ff' }}>{task.initials || 'U'}</span><span>{task.assignee || 'Unassigned'}</span><button className="move-next" onClick={() => onMove(task, nextStatus)}>{status === 'done' ? 'Reopen' : status === 'todo' ? 'Start' : 'Complete'} <ArrowUpRight size={12} /></button></div>
                    </article>
                  );
                })}
                {!list.length && <div className="empty-column">No tasks here yet.<button onClick={onNew}>Add one</button></div>}
              </div>
            </section>
          );
        })}
      </div>
      <p className="board-hint"><CircleHelp size={14} /> Move tasks through the workflow using the action button. Changes are saved to your account.</p>
    </>
  );
}

export function Team({ tasks }) {
  return (
    <>
      <div className="team-summary">
        <div className="team-summary-icon"><Users size={21} /></div>
        <div>
          <h2>Build your team.</h2>
          <p>Team members will appear here when shared workspace invitations are connected.</p>
        </div>
        <span className="team-count">No members added</span>
      </div>
      <div className="team-grid">
        <div className="invite-card">
          <span><Users size={21} /></span>
          <b>Team collaboration</b>
          <small>
            This workspace is ready for team features. Member profiles and shared access
            will appear here when real membership records are available.
          </small>
        </div>
      </div>
    </>
  );
}

export function ActivityPage({ activity }) {
  return <section className="panel activity-full"><div className="panel-heading"><div><h2>Workspace timeline</h2><p>Updates from your projects and tasks.</p></div><span className="live-label"><span className="live-dot" /> Recent</span></div>{activity.map((item, index) => <div className="timeline-row" key={`${item.text}-${index}`}><ActivityItem item={item} /><span className="timeline-type">{item.color === 'green' ? 'Completed / created' : 'Workspace update'}</span></div>)}{!activity.length && <EmptyState title="Nothing to show yet" text="New activity appears here when you update your workspace." />}</section>;
}

export function Analytics({ projects, tasks }) {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.filter(t => t.status === 'progress').length;
  const todo = tasks.filter(t => t.status === 'todo').length;

  return (
    <>
      <div className="stats-grid"><StatCard label="Total tasks" value={total} note="Across all projects" icon={FolderKanban} tone="purple" /><StatCard label="Completion rate" value={`${total ? Math.round(done / total * 100) : 0}%`} note="Tasks marked done" icon={CircleCheckBig} tone="green" /><StatCard label="In progress" value={progress} note="Currently being worked on" icon={Activity} tone="blue" /><StatCard label="Not started" value={todo} note="Waiting for a first step" icon={Clock3} tone="orange" /></div>
      <div className="analytics-grid">
        <section className="panel"><div className="panel-heading"><div><h2>Task breakdown</h2><p>Current workflow distribution</p></div></div><div className="bar-chart">{[['To do', todo, 'bar-todo'], ['In progress', progress, 'bar-progress'], ['Done', done, 'bar-done']].map(([name, value, cls]) => <div className="bar-row" key={name}><div className="bar-label"><span>{name}</span><b>{value}</b></div><div className="bar-track"><div className={`bar-fill ${cls}`} style={{ width: `${total ? value / total * 100 : 0}%` }} /></div></div>)}</div><div className="chart-footnote">Based on {total} workspace tasks · Updates as tasks change</div></section>
        <section className="panel"><div className="panel-heading"><div><h2>Project progress</h2><p>Completion by project</p></div></div><div className="analytics-project-list">{projects.map(project => { const related = tasks.filter(t => t.project === project.name); const complete = related.filter(t => t.status === 'done').length; const percentage = related.length ? Math.round(complete / related.length * 100) : 0; return <div className="analytics-project" key={project.id}><div className="analytics-project-icon" style={{ background: project.color }}>{project.initials}</div><div className="analytics-project-body"><div><b>{project.name}</b><span>{percentage}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${percentage}%` }} /></div></div></div>; })}{!projects.length && <EmptyState title="No projects" text="Create a project to see progress." />}</div></section>
      </div>
      <div className="notice-strip"><Sparkles size={18} /><div><b>Workspace analytics</b><p>Metrics are calculated from your saved workspace tasks. They update as you create, complete, or delete tasks.</p></div></div>
    </>
  );
}

export function DeadlineIntelligence({
  tasks,
  report,
  loading,
  error,
  onAnalyze,
  azureReport,
  azureLoading,
  azureError,
  onAzureAnalyze
}) {
  const today = todayISO();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;
  const open = tasks.filter(t => t.status !== 'done');
  const overdue = open.filter(t => t.due && t.due < today);
  const dueToday = open.filter(t => t.due === today);
  const dueTomorrow = open.filter(t => t.due === tomorrow);

  const returned = report ? (
    Array.isArray(report.tasks) ? report.tasks :
    Array.isArray(report.results) ? report.results :
    Array.isArray(report.analyses) ? report.analyses :
    Array.isArray(report.taskAnalysis) ? report.taskAnalysis :
    Array.isArray(report.items) ? report.items : []
  ) : [];

  const findRisk = task => returned.find(item =>
    String(item.id ?? item.taskId ?? item.task_id ?? '') === String(task.id) ||
    String(item.title ?? item.taskTitle ?? item.task_title ?? '').trim().toLowerCase() === task.title.trim().toLowerCase()
  );

  const riskLabel = analysis => {
    const raw = analysis?.riskLevel ?? analysis?.risk_level ?? analysis?.risk ?? analysis?.label ?? analysis?.severity;
    return typeof raw === 'string' && raw.trim() ? raw : 'Not analyzed';
  };

  const recommendation = analysis => {
    const value =
      analysis?.recommendation ??
      analysis?.recommendations ??
      analysis?.suggestion ??
      analysis?.action ??
      analysis?.nextStep ??
      analysis?.next_step;

    if (Array.isArray(value)) return value.filter(Boolean).join(' ');
    if (typeof value === 'string' && value.trim()) return value;

    const overall = report?.recommendations;
    if (Array.isArray(overall) && overall.length) return overall.join(' ');

    if (String(analysis?.risk ?? '').toLowerCase() === 'overdue') {
      return 'Prioritize this overdue task and update its deadline.';
    }

    return 'Review this task and confirm its deadline.';
  };

  const scoreKeys = ['overallRiskScore', 'overall_risk_score', 'overallRisk', 'overall_risk', 'riskScore', 'risk_score', 'score', 'totalRiskScore', 'total_risk_score'];
  const scoreSources = [report, report?.summary, report?.overall, report?.data, report?.result].filter(s => s && typeof s === 'object');
  let rawScore;
  for (const src of scoreSources) {
    const key = scoreKeys.find(k => src[k] !== undefined && src[k] !== null && src[k] !== '');
    if (key) { rawScore = src[key]; break; }
  }
  const parsed = Number(rawScore);
  const serviceScore = rawScore !== undefined && Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : null;

  // Fallback: average of per-task risk labels when the service sends no overall score
  const levelValue = { critical: 100, high: 80, medium: 50, moderate: 50, low: 20, safe: 0 };
  const labelScores = report ? tasks.map(t => {
    const l = String(riskLabel(findRisk(t))).toLowerCase();
    const key = Object.keys(levelValue).find(k => l.includes(k));
    return key ? levelValue[key] : null;
  }).filter(v => v !== null) : [];
  const computedScore = labelScores.length ? Math.round(labelScores.reduce((s, v) => s + v, 0) / labelScores.length) : null;
  const score = serviceScore ?? computedScore;
  const scoreFromService = serviceScore !== null;
  const summary = typeof report?.summary === 'string' ? report.summary : report?.summary?.message ?? report?.message ?? report?.overview ?? '';

  const riskClass = value => {
    const risk = String(value).toLowerCase();
    if (risk.includes('critical') || risk.includes('high')) return 'risk-high';
    if (risk.includes('medium') || risk.includes('moderate')) return 'risk-medium';
    if (risk.includes('low') || risk.includes('safe')) return 'risk-low';
    return 'risk-unknown';
  };

  return (
    <div className="deadline-page">
      <section className="panel deadline-hero"><div className="deadline-hero-copy"><span className="deadline-kicker"><Zap size={14} /> RULE-BASED DEADLINE ANALYSIS</span><h2>Know what could slip before it does.</h2><p>Analyze your workspace tasks with a Cloudflare Worker to retrieve risk labels and recommendations. This is rule-based analysis, not a machine-learning model.</p><button className="button button-primary" onClick={onAnalyze} disabled={loading}><Zap size={16} />{loading ? 'Analyzing workspace…' : report ? 'Run analysis again' : 'Analyze deadlines'}</button></div><div className="deadline-hero-art"><div className="deadline-art-ring ring-a" /><div className="deadline-art-ring ring-b" /><div className="deadline-art-core"><Clock3 size={30} /></div></div></section>

      {error && <div className="deadline-error" role="alert"><div><b>Could not complete deadline analysis</b><p>{error}</p></div><button className="button button-secondary" onClick={onAnalyze} disabled={loading}><RefreshCw size={14} /> Retry</button></div>}

      <div className="stats-grid deadline-stats"><StatCard label="Overdue" value={overdue.length} note="Open tasks past their due date" icon={Clock3} tone="orange" /><StatCard label="Due today" value={dueToday.length} note="Open tasks due today" icon={CalendarDays} tone="blue" /><StatCard label="Due tomorrow" value={dueTomorrow.length} note="Prepare these next" icon={Bell} tone="purple" /><StatCard label="Overall risk score" value={score === null ? '—' : `${score}/100`} note={score === null ? 'Run analysis to retrieve a score' : scoreFromService ? 'Returned by the service' : 'Calculated from task risk levels'} icon={Gauge} tone={score !== null && score >= 70 ? 'orange' : 'green'} /></div>
      <section className="panel deadline-results azure-health-panel">
        <div className="panel-heading">
          <div>
            <h2>Azure Project Health</h2>
            <p>Project health metrics calculated by your Azure Functions API.</p>
          </div>
          <span className="deadline-service-status">
            <span />
            Microsoft Azure
          </span>
        </div>

        <button
          className="button button-primary"
          onClick={onAzureAnalyze}
          disabled={azureLoading}
        >
          <Gauge size={16} />
          {azureLoading ? 'Checking project health…' : 'Analyze project health'}
        </button>

        {azureError && (
          <div className="deadline-error" role="alert">
            <div>
              <b>Azure analysis failed</b>
              <p>{azureError}</p>
            </div>
            <button
              className="button button-secondary"
              onClick={onAzureAnalyze}
              disabled={azureLoading}
            >
              Retry
            </button>
          </div>
        )}

        {azureReport && (
          <>
            <div className="stats-grid deadline-stats">
              <StatCard
                label="Project health"
                value={azureReport.health || 'Unknown'}
                note="Azure assessment"
                icon={Gauge}
                tone={
                  azureReport.health === 'Needs Attention'
                    ? 'orange'
                    : azureReport.health === 'At Risk'
                      ? 'purple'
                      : 'green'
                }
              />
              <StatCard
                label="Completion"
                value={`${azureReport.completionPercentage ?? 0}%`}
                note={`${azureReport.completedTasks ?? 0} completed tasks`}
                icon={Check}
                tone="green"
              />
              <StatCard
                label="Overdue tasks"
                value={azureReport.overdueTasks ?? 0}
                note="Uncompleted tasks past deadline"
                icon={AlertTriangle}
                tone="orange"
              />
              <StatCard
                label="At-risk tasks"
                value={azureReport.atRiskTasks ?? 0}
                note="Due within three days"
                icon={Bell}
                tone="purple"
              />
            </div>

            <div className="deadline-summary">
              <Sparkles size={16} />
              <p>
                {azureReport.summary ||
                  'Azure project health analysis completed.'}
              </p>
            </div>
          </>
        )}
      </section>


      <section className="panel deadline-results"><div className="panel-heading"><div><h2>Task-level analysis</h2><p>{report ? 'Risk labels and recommendations returned by the Cloudflare Worker.' : 'Run an analysis to load results for your workspace.'}</p></div>{report && <span className="deadline-service-status"><span /> Response received</span>}</div>
        {summary && <div className="deadline-summary"><Sparkles size={16} /><p>{summary}</p></div>}
        {!report && !loading && !error && <div className="deadline-empty"><div className="deadline-empty-icon"><Zap size={22} /></div><h3>Your deadline report is ready</h3><p>Analysis uses the tasks currently loaded from your workspace.</p><button className="button button-primary" onClick={onAnalyze}>Analyze {tasks.length} tasks</button></div>}
        {loading && <div className="deadline-loading"><LoaderCircle className="spin" size={23} /><div><b>Analyzing your deadlines</b><p>Sending {tasks.length} tasks to the Cloudflare Worker…</p></div></div>}
        {report && !loading && (returned.length === 0 ? <div className="deadline-empty compact-empty"><h3>Response received, but no task results were recognized.</h3><p>Check your Worker's JSON response and map its task array to the expected fields.</p><details className="deadline-raw-response"><summary>Inspect raw response</summary><pre>{JSON.stringify(report, null, 2)}</pre></details></div> : <div className="table-wrap"><table className="task-table deadline-table"><thead><tr><th>Task</th><th>Due date</th><th>Priority</th><th>Risk</th><th>Recommendation</th></tr></thead><tbody>{tasks.map(task => { const analysis = findRisk(task); const label = riskLabel(analysis); return <tr key={task.id}><td><div className="task-cell"><div><b>{task.title}</b><small>{task.project}</small></div></div></td><td><span className="date-text"><CalendarDays size={13} />{formatDate(task.due)}</span></td><td><Priority value={task.priority} /></td><td><span className={`deadline-risk ${riskClass(label)}`}>{label}</span></td><td className="recommendation-cell">{recommendation(analysis)}</td></tr>; })}</tbody></table></div>)}
      </section>
      <div className="deadline-footnote"><Building2 size={16} /><span><b>Cloud flow:</b> Firebase Auth identifies your account, Firestore stores workspace data, and your frontend sends tasks to a Cloudflare Worker for analysis.</span></div>
    </div>
  );
}

export function SettingsPage({ user, cloudStatus, onReset }) {
  return (
    <div className="settings-layout">
      <section className="panel settings-panel"><div className="panel-heading"><div><h2>Account & workspace</h2><p>Your current SyncSpace connection details.</p></div></div>
        <div className="setting-row"><div><b>Signed-in account</b><p>{user.email || 'Authenticated account'}</p></div><span className="setting-pill green-pill">Firebase Auth</span></div>
        <div className="setting-row"><div><b>Workspace storage</b><p>Your data is scoped to your Firebase user ID.</p></div><span className="setting-pill green-pill">Firestore</span></div>
        <div className="setting-row"><div><b>Cloud sync</b><p>Current connection status.</p></div><span className={`setting-pill ${cloudStatus === 'Synced' ? 'green-pill' : 'yellow-pill'}`}>{cloudStatus}</span></div>
        <div className="setting-row"><div><b>Local cache</b><p>A user-specific browser cache helps preserve data during connection issues.</p></div><span className="setting-pill">Enabled</span></div>
      </section>
      <section className="panel settings-panel"><div className="panel-heading"><div><h2>Demo data</h2><p>Restore the seeded example workspace.</p></div></div><p className="settings-body-copy">This replaces the current projects, tasks and activity in your cloud workspace. Only use it if you want to discard your current changes.</p><button className="button button-secondary danger-outline" onClick={onReset}><RefreshCw size={15} /> Restore demo data</button></section>
    </div>
  );
}

export const globalStyles = `
:root {
  --text: #222236;
  --muted: #818197;
  --surface: #ffffff;
  --canvas: #f7f7fb;
  --border: #e9e9f1;
  --accent: #7667df;
  --accent-soft: #f0edff;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--text); background: var(--canvas); }
button, input, select { font: inherit; }
button { cursor: pointer; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #8a7be8; outline-offset: 2px; }
.app-shell { min-height: 100vh; }
.sidebar { width: 254px; position: fixed; inset: 0 auto 0 0; z-index: 40; display: flex; flex-direction: column; background: #fff; border-right: 1px solid var(--border); padding: 23px 15px 13px; }
.brand { display: flex; align-items: center; gap: 10px; padding: 0 9px 27px; font-size: 22px; font-weight: 780; letter-spacing: -1px; }
.brand-mark, .loading-logo { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; color: white; background: linear-gradient(145deg,#8b7bf0,#6150ca); box-shadow: 0 4px 12px #7667df30; }
.brand-period { color: var(--accent); }
.mobile-close, .mobile-menu { display: none; }
.workspace-wrap, .profile-wrap { position: relative; }
.workspace-switch { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px; text-align: left; border: 1px solid var(--border); background: #fff; border-radius: 12px; color: inherit; }
.workspace-avatar { display: grid; place-items: center; flex: 0 0 33px; height: 33px; border-radius: 10px; background: #eeeaff; color: #6654ca; font-weight: 800; }
.workspace-name, .profile-text { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 4px; }
.workspace-name b, .profile-text b { font-size: 12px; }
.workspace-name span, .profile-text span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; color: var(--muted); }
.nav-scroll { flex: 1; overflow-y: auto; padding-top: 20px; }
.nav-group { margin-bottom: 23px; }
.nav-label { padding: 0 10px 9px; color: #9a9aab; font-size: 10px; font-weight: 800; letter-spacing: .09em; }
.nav-label-row { display: flex; align-items: center; justify-content: space-between; }
.nav-item { display: flex; align-items: center; gap: 11px; width: 100%; padding: 10px; margin: 2px 0; border: 0; border-radius: 9px; background: transparent; color: #77778d; font-size: 12px; text-align: left; transition: .16s; }
.nav-item:hover { background: #f7f6ff; color: #5547b5; }
.nav-item.active { background: #f0edff; color: #6353ca; font-weight: 700; }
.nav-count { margin-left: auto; padding: 3px 7px; background: #e3dfff; color: #6554c8; border-radius: 6px; font-size: 10px; }
.tiny-add, .column-add { display: grid; place-items: center; border: 0; border-radius: 6px; background: transparent; color: #85859a; padding: 4px; }
.tiny-add:hover, .column-add:hover { background: #f0edff; color: var(--accent); }
.project-nav { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; border-radius: 8px; background: transparent; padding: 9px 10px; text-align: left; font-size: 11px; color: #727287; }
.project-nav:hover { background: #f8f7fc; }
.project-nav span:last-child { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.project-dot, .project-mini-dot { width: 9px; height: 9px; flex: 0 0 9px; border-radius: 3px; }
.sidebar-bottom { padding-top: 12px; }
.upgrade-card { padding: 14px; margin-bottom: 12px; border-radius: 12px; border: 1px solid #e9e4ff; background: linear-gradient(145deg,#f8f6ff,#fff); }
.upgrade-icon { display: grid; place-items: center; width: 29px; height: 29px; border-radius: 9px; background: #e9e4ff; color: #7060d2; margin-bottom: 10px; }
.upgrade-card>b { font-size: 11px; }
.upgrade-card p { font-size: 10px; line-height: 1.6; color: var(--muted); }
.upgrade-card button, .text-button, .activity-link { display: inline-flex; align-items: center; gap: 5px; border: 0; background: transparent; color: #6d5ad2; font-size: 10px; font-weight: 700; padding: 0; }
.profile { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; border-top: 1px solid var(--border); background: white; padding: 13px 4px 3px; color: inherit; text-align: left; }
.avatar { display: grid; place-items: center; flex: 0 0 34px; height: 34px; border-radius: 50%; font-size: 10px; font-weight: 800; }
.avatar-purple { background: #e5e0ff; color: #6653ca; }
.main-area { min-height: 100vh; margin-left: 254px; }
.topbar { height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 0 35px; background: rgba(255,255,255,.88); border-bottom: 1px solid var(--border); }
.breadcrumb { font-size: 11px; color: #8b8b9d; }
.breadcrumb span { padding: 0 9px; color: #c0c0cd; }
.breadcrumb b { color: #333348; font-weight: 650; }
.top-actions { display: flex; align-items: center; gap: 14px; }
.search-box { display: flex; align-items: center; gap: 9px; width: 245px; padding: 9px 11px; background: #f8f8fb; border: 1px solid #eeeef4; border-radius: 10px; color: #9292a5; }
.search-box:focus-within { border-color: #b4aaf4; box-shadow: 0 0 0 3px #7667df12; }
.search-box input { min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; color: var(--text); font-size: 11px; }
.search-box input:focus-visible { outline: 0; }
.search-box kbd { white-space: nowrap; padding: 3px 5px; border: 1px solid #e5e5ed; border-radius: 5px; background: white; font-size: 9px; }
.search-clear { border: 0; background: transparent; color: var(--muted); padding: 0; }
.icon-button { position: relative; display: grid; place-items: center; width: 35px; height: 35px; border: 1px solid var(--border); border-radius: 10px; background: white; color: #73738a; }
.icon-button:hover { background: #f5f3ff; color: var(--accent); }
.top-avatar { display: grid; place-items: center; width: 34px; height: 34px; border: 0; border-radius: 50%; background: #e5e0ff; color: #6653ca; font-size: 10px; font-weight: 800; }
.content { max-width: 1660px; margin: 0 auto; padding: 32px 35px 20px; }
.page-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 27px; }
.eyebrow { display: flex; align-items: center; gap: 7px; color: #8374db; font-size: 9px; font-weight: 800; letter-spacing: .1em; }
.live-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #45bf8a; box-shadow: 0 0 0 3px #45bf8a1c; }
.page-heading h1 { margin: 10px 0 7px; font-size: clamp(25px,3vw,33px); letter-spacing: -1.2px; line-height: 1.15; font-weight: 750; }
.wave { font-size: 23px; }
.page-heading p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.6; }
.heading-actions { display: flex; gap: 9px; flex-shrink: 0; }
.button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 10px 14px; border: 1px solid transparent; border-radius: 9px; font-size: 11px; font-weight: 650; transition: .16s; }
.button-primary { background: #7667df; color: white; box-shadow: 0 3px 10px #7667df22; }
.button-primary:hover:not(:disabled) { background: #6757d0; transform: translateY(-1px); box-shadow: 0 6px 16px #7667df30; }
.button-secondary { background: white; color: #55556b; border-color: #e6e6ef; }
.button-secondary:hover { background: #f8f7ff; border-color: #d5cff8; }
.button:disabled { opacity: .6; cursor: wait; }
.stats-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 15px; margin-bottom: 20px; }
.stat-card, .panel, .project-card, .team-card { border: 1px solid var(--border); border-radius: 14px; background: white; box-shadow: 0 2px 7px #24244504; }
.stat-card { padding: 18px; min-width: 0; transition: .18s; }
.stat-card:hover { border-color: #dcd6ff; box-shadow: 0 8px 22px #24244508; }
.stat-icon { display: grid; place-items: center; width: 36px; height: 36px; margin-bottom: 15px; border-radius: 11px; }
.stat-icon.purple { color: #7665d5; background: #efecff; }
.stat-icon.blue { color: #4686d8; background: #eaf3ff; }
.stat-icon.green { color: #289c72; background: #e6f8ef; }
.stat-icon.orange { color: #d38a3b; background: #fff2e3; }
.stat-label { color: #77778d; font-size: 11px; }
.stat-value { margin: 6px 0 5px; font-size: 27px; font-weight: 760; letter-spacing: -.8px; }
.stat-note { color: #9292a4; font-size: 10px; line-height: 1.5; }
.overview-grid { display: grid; grid-template-columns: minmax(0,1.55fr) minmax(270px,1fr); gap: 18px; margin-bottom: 19px; }
.panel { padding: 21px; min-width: 0; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 19px; }
.panel-heading h2, .section-intro h2 { margin: 0; font-size: 14px; letter-spacing: -.2px; }
.panel-heading p, .section-intro p { margin: 5px 0 0; font-size: 10px; color: var(--muted); line-height: 1.6; }
.project-list { display: flex; flex-direction: column; }
.project-row { display: flex; align-items: center; gap: 12px; padding: 13px 0; border-bottom: 1px solid #f0f0f5; }
.project-row:first-child { padding-top: 0; }
.project-row:last-child { border-bottom: 0; }
.project-row-button { width: 100%; border: 0; background: transparent; text-align: left; color: inherit; cursor: pointer; }
.project-row-button:hover .project-title-row b { color: #6d5ad2; }
.project-symbol { display: grid; place-items: center; flex: 0 0 39px; height: 39px; border-radius: 12px; color: #45445d; font-size: 10px; font-weight: 800; }
.project-info { min-width: 0; flex: 1; }
.project-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.project-title-row b { font-size: 11px; }
.project-tag { padding: 4px 7px; border-radius: 5px; background: #f4f3fa; color: #77758e; font-size: 9px; white-space: nowrap; }
.project-meta { display: flex; gap: 7px; margin: 6px 0 9px; color: #9292a4; font-size: 9px; }
.progress-track { height: 5px; overflow: hidden; border-radius: 10px; background: #f0eff6; }
.progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg,#8777ec,#a59af4); transition: width .25s; }
.progress-number { color: #68677f; font-size: 10px; font-weight: 750; }
.add-project-row { display: flex; align-items: center; gap: 9px; width: 100%; margin-top: 10px; padding: 11px 0 0; border: 0; border-top: 1px solid #f0f0f5; background: transparent; color: #73718b; font-size: 10px; text-align: left; }
.add-project-row>span { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 7px; background: #f0edff; color: #6d5bd4; }
.completion-panel { display: flex; flex-direction: column; }
.muted-icon { color: #9998aa; }
.completion-ring-wrap { display: grid; place-items: center; padding: 5px 0 20px; }
.completion-ring { display: grid; place-items: center; width: 142px; height: 142px; border-radius: 50%; background: conic-gradient(#8070e6 var(--progress),#f0eef8 0); position: relative; }
.ring-inner { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: 116px; height: 116px; border-radius: 50%; background: white; }
.ring-inner strong { font-size: 28px; letter-spacing: -1px; }
.ring-inner span { color: var(--muted); font-size: 10px; }
.health-legend { display: flex; flex-direction: column; gap: 12px; }
.health-legend>div { display: flex; align-items: center; gap: 9px; font-size: 10px; color: #77778d; }
.health-legend b { margin-left: auto; color: var(--text); }
.legend-dot { width: 8px; height: 8px; border-radius: 3px; }
.dot-done { background: #4bbb91; }
.dot-progress { background: #9483ec; }
.dot-todo { background: #d4d3df; }
.health-note { display: flex; align-items: flex-start; gap: 8px; margin-top: 20px; padding: 11px; border-radius: 9px; background: #f7f5ff; color: #7668c6; font-size: 10px; line-height: 1.5; }
.health-note svg { flex-shrink: 0; }
.lower-grid { display: grid; grid-template-columns: minmax(0,1.55fr) minmax(270px,1fr); gap: 18px; margin-bottom: 20px; }
.table-wrap { overflow-x: auto; width: 100%; }
.task-table { width: 100%; border-collapse: collapse; text-align: left; white-space: nowrap; }
.task-table th { padding: 10px 9px; background: #fafafd; color: #9695a7; font-size: 9px; font-weight: 650; }
.task-table td { padding: 13px 9px; border-bottom: 1px solid #f0f0f5; font-size: 10px; }
.task-table tr:last-child td { border-bottom: 0; }
.task-cell { display: flex; align-items: center; gap: 9px; min-width: 165px; }
.task-cell>div { display: flex; flex-direction: column; gap: 5px; }
.task-cell b { max-width: 200px; overflow: hidden; text-overflow: ellipsis; font-size: 10px; font-weight: 650; }
.task-cell small { color: #9898aa; font-size: 9px; }
.task-checkbox { display: grid; place-items: center; flex: 0 0 18px; width: 18px; height: 18px; border: 1px solid #dddbea; border-radius: 6px; background: white; color: #8271dd; }
.task-checkbox:hover { background: #efedff; }
.priority { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 650; }
.priority i { width: 6px; height: 6px; border-radius: 50%; background: #a0a0b2; }
.priority-high { color: #c45c63; }
.priority-high i { background: #e8757c; }
.priority-medium { color: #bb873e; }
.priority-medium i { background: #eab75f; }
.priority-low { color: #439c7c; }
.priority-low i { background: #63c49c; }
.date-text { display: inline-flex; align-items: center; gap: 5px; color: #85859a; font-size: 9px; }
.status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 5px 7px; border-radius: 6px; font-size: 9px; font-weight: 650; }
.status-pill.todo { color: #77778d; background: #f1f1f6; }
.status-pill.progress { color: #6d5bd0; background: #efedff; }
.status-pill.done { color: #238b66; background: #e5f7ee; }
.activity-list { display: flex; flex-direction: column; }
.activity-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px 0; }
.activity-item+.activity-item { border-top: 1px solid #f2f2f7; }
.activity-mark { display: grid; place-items: center; flex: 0 0 28px; width: 28px; height: 28px; border-radius: 9px; }
.activity-mark.green { background: #e5f8ee; color: #3ca47b; }
.activity-mark.purple { background: #efedff; color: #7a68d8; }
.activity-mark.orange { background: #fff0df; color: #d38b43; }
.activity-item p { margin: 0 0 6px; font-size: 10px; line-height: 1.55; }
.activity-item span { color: #9999ab; font-size: 9px; }
.activity-link { padding-top: 14px; margin-top: 5px; border-top: 1px solid #f0f0f5; width: 100%; }
.focus-banner { display: flex; align-items: center; gap: 22px; padding: 22px 25px; margin-bottom: 20px; border: 1px solid #e8e3ff; border-radius: 14px; background: linear-gradient(105deg,#f1eeff,#fbfaff 70%,#f2f9ff); }
.focus-art { display: grid; place-items: center; position: relative; flex: 0 0 65px; height: 65px; }
.focus-orbit { position: absolute; border: 1px solid #b6abf4; border-radius: 50%; transform: rotate(-25deg); }
.orbit-one { width: 64px; height: 28px; }
.orbit-two { width: 48px; height: 57px; transform: rotate(35deg); }
.focus-spark { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 12px; background: #dcd5ff; color: #6f5cd2; }
.focus-copy { flex: 1; }
.focus-kicker { color: #8271d6; font-size: 9px; font-weight: 800; letter-spacing: .1em; }
.focus-copy h2 { margin: 7px 0 5px; font-size: 17px; letter-spacing: -.4px; }
.focus-copy p { margin: 0; color: #83829a; font-size: 10px; line-height: 1.6; }
.focus-button { color: #6554ca; background: white; border-color: #e2dcff; white-space: nowrap; }
.footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 17px 0 5px; color: #a0a0b0; font-size: 9px; }
.footer-status { display: inline-flex; align-items: center; gap: 7px; }
.footer-status i { width: 6px; height: 6px; border-radius: 50%; background: #d6a64f; }
.footer-status i.online { background: #42b98a; }
.footer-status i.offline { background: #e28c8c; }
.footer-sep { color: #c9c9d4; }
.action-dropdown { position: absolute; z-index: 100; min-width: 180px; padding: 6px; border: 1px solid var(--border); border-radius: 11px; background: white; box-shadow: 0 12px 32px #17172d18; }
.action-dropdown button { display: flex; align-items: center; gap: 9px; width: 100%; padding: 10px; border: 0; border-radius: 7px; background: transparent; color: #55556b; text-align: left; font-size: 11px; }
.action-dropdown button:hover { background: #f6f5fc; }
.workspace-dropdown { top: calc(100% + 6px); left: 0; right: 0; }
.profile-dropdown { bottom: calc(100% + 7px); left: 0; right: 0; }
.dropdown-heading { display: flex; flex-direction: column; gap: 5px; padding: 10px; border-bottom: 1px solid var(--border); margin-bottom: 5px; }
.dropdown-heading b { font-size: 11px; }
.dropdown-heading span { font-size: 10px; color: var(--muted); overflow-wrap: anywhere; }
.delete-action { color: #c3424d !important; }
.section-intro { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 20px; }
.count-pill, .team-count { padding: 5px 8px; border-radius: 7px; background: #efedff; color: #6d5bd0; font-size: 10px; font-weight: 700; }
.project-cards { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 17px; }
.project-card { position: relative; padding: 20px; transition: .18s; min-width: 0; }
.project-card:hover, .team-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px #2424450a; }
.project-card-top { display: flex; align-items: center; gap: 10px; }
.project-symbol.large { width: 47px; height: 47px; flex-basis: 47px; font-size: 12px; }
.project-actions { position: relative; margin-left: auto; }
.project-actions-trigger, .card-more { display: grid; place-items: center; width: 29px; height: 29px; border: 0; border-radius: 7px; background: transparent; color: #8b8ba0; }
.project-actions-trigger:hover, .card-more:hover { background: #f2f0ff; color: #6d5bd0; }
.project-card .action-dropdown { top: 34px; right: 0; }
.project-card-open { display: block; width: 100%; margin: 16px 0; padding: 0; border: 0; background: transparent; text-align: left; color: inherit; }
.project-card h3 { margin: 0 0 8px; font-size: 14px; letter-spacing: -.2px; }
.project-card-desc { min-height: 35px; margin: 0; color: #88889c; font-size: 10px; line-height: 1.7; }
.project-card-stats { display: flex; gap: 16px; padding: 12px 0; border-top: 1px solid #f1f1f6; color: #77778d; font-size: 10px; }
.project-card-stats span { display: flex; align-items: center; gap: 5px; }
.card-progress-head { display: flex; justify-content: space-between; margin: 5px 0 9px; color: #89899d; font-size: 10px; }
.card-progress-head b { color: #5c5b74; }
.avatar-stack { display: flex; padding-top: 17px; }
.mini-avatar { display: inline-grid; place-items: center; flex: 0 0 27px; width: 27px; height: 27px; border: 2px solid white; border-radius: 50%; font-size: 8px; font-weight: 750; color: #44435b; }
.avatar-stack .mini-avatar+.mini-avatar { margin-left: -6px; }
.new-project-card, .invite-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; min-height: 220px; padding: 22px; border: 1px dashed #d9d5ee; border-radius: 14px; background: #fbfaff; text-align: center; color: #6d5bd0; }
.new-project-card>span, .invite-card>span { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; background: #eeeaff; }
.new-project-card b, .invite-card b { font-size: 12px; }
.new-project-card small, .invite-card small { max-width: 210px; color: #9291a6; font-size: 10px; line-height: 1.7; }
.task-toolbar { display: flex; align-items: center; gap: 15px; margin-bottom: 18px; }
.filter-select { display: flex; align-items: center; gap: 8px; padding: 9px 11px; border: 1px solid var(--border); border-radius: 9px; background: white; color: #77778c; }
.filter-select select { max-width: 230px; border: 0; outline: 0; background: transparent; color: #55556b; font-size: 10px; }
.task-count { flex: 1; color: #9090a3; font-size: 10px; }
.kanban { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); align-items: start; gap: 15px; }
.kanban-column { min-width: 0; padding: 12px; border: 1px solid #ebebf3; border-radius: 13px; background: #f1f1f8; }
.kanban-head { display: flex; align-items: center; gap: 8px; padding: 4px 2px 13px; }
.kanban-head>b { font-size: 11px; }
.status-icon { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 7px; }
.status-icon.todo { background: #e4e4ec; color: #77778d; }
.status-icon.progress { background: #e3deff; color: #7260d3; }
.status-icon.done { background: #d9f4e7; color: #269a70; }
.column-count { display: grid; place-items: center; min-width: 21px; height: 21px; padding: 0 5px; border-radius: 6px; background: #fff; color: #88889b; font-size: 9px; }
.column-add { margin-left: auto; }
.kanban-cards { display: flex; flex-direction: column; gap: 10px; }
.kanban-card { min-width: 0; padding: 13px; border: 1px solid #e8e8f0; border-radius: 11px; background: white; box-shadow: 0 2px 4px #28284205; transition: .18s; }
.kanban-card:hover { border-color: #d2cbff; box-shadow: 0 6px 18px #28284209; }
.kanban-card-top { display: flex; align-items: center; gap: 7px; }
.kanban-project { overflow: hidden; color: #89899c; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.task-menu-wrap { position: relative; margin-left: auto; }
.task-actions-dropdown { top: 32px; right: 0; }
.kanban-card h3 { margin: 13px 0; font-size: 12px; line-height: 1.55; font-weight: 700; overflow-wrap: anywhere; }
.kanban-card-bottom { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding-bottom: 12px; }
.kanban-assignee { display: flex; align-items: center; gap: 7px; padding-top: 10px; border-top: 1px solid #f0f0f5; color: #77778b; font-size: 9px; }
.kanban-assignee .mini-avatar { width: 25px; height: 25px; flex-basis: 25px; }
.move-next { display: inline-flex; align-items: center; gap: 3px; margin-left: auto; border: 0; background: transparent; color: #7260d3; font-size: 9px; font-weight: 700; }
.empty-column { padding: 25px 5px; text-align: center; color: #9898aa; font-size: 10px; }
.empty-column button { display: block; margin: 10px auto 0; border: 0; background: transparent; color: #6e5cd2; font-size: 10px; font-weight: 700; }
.board-hint { display: flex; align-items: center; gap: 7px; margin: 16px 0; color: #8e8ea1; font-size: 10px; }
.task-overdue { display: inline-flex; align-items: center; gap: 4px; padding: 5px 7px; border-radius: 6px; background: #fff0f0; color: #bd424b; font-size: 9px; font-weight: 750; }
.team-summary { display: flex; align-items: center; gap: 13px; padding: 20px; margin-bottom: 20px; border: 1px solid var(--border); border-radius: 13px; background: white; }
.team-summary-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: #efedff; color: #6d5bd0; }
.team-summary h2 { margin: 0; font-size: 14px; }
.team-summary p { margin: 5px 0 0; color: var(--muted); font-size: 10px; }
.team-count { margin-left: auto; white-space: nowrap; }
.team-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 17px; }
.team-card { padding: 20px; transition: .18s; }
.team-card-top { display: flex; align-items: center; gap: 9px; }
.avatar-large { width: 46px; height: 46px; flex-basis: 46px; font-size: 12px; }
.member-online { display: flex; align-items: center; gap: 5px; color: #8d8d9f; font-size: 9px; }
.member-online i { width: 6px; height: 6px; border-radius: 50%; background: #49b98a; }
.team-card h3 { margin: 16px 0 5px; font-size: 13px; }
.team-card>p { margin: 0; color: #88889d; font-size: 10px; }
.member-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; padding: 18px 0 14px; }
.member-stats>div { display: flex; flex-direction: column; gap: 5px; }
.member-stats b { font-size: 16px; }
.member-stats span { color: #9393a5; font-size: 9px; }
.activity-full { padding: 24px; }
.activity-full .timeline-row { display: flex; align-items: center; gap: 15px; padding: 12px 0; border-top: 1px solid #f0f0f5; }
.timeline-row .activity-item { flex: 1; border: 0; padding: 0; }
.timeline-type { color: #9292a4; font-size: 9px; white-space: nowrap; }
.live-label { display: inline-flex; align-items: center; gap: 8px; color: #7d7d92; font-size: 10px; }
.analytics-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; }
.bar-chart { display: flex; flex-direction: column; gap: 22px; padding: 14px 0; }
.bar-label { display: flex; justify-content: space-between; margin-bottom: 9px; font-size: 10px; color: #77778d; }
.bar-label b { color: var(--text); }
.bar-track { height: 9px; overflow: hidden; border-radius: 20px; background: #f0eff7; }
.bar-fill { height: 100%; border-radius: inherit; }
.bar-todo { background: #c9c7d7; }
.bar-progress { background: #9483ec; }
.bar-done { background: #4bbb91; }
.chart-footnote { padding-top: 13px; border-top: 1px solid #f0f0f5; color: #9292a4; font-size: 9px; }
.analytics-project-list { display: flex; flex-direction: column; gap: 20px; }
.analytics-project { display: flex; align-items: center; gap: 11px; }
.analytics-project-icon { display: grid; place-items: center; width: 37px; height: 37px; flex: 0 0 37px; border-radius: 10px; font-size: 10px; font-weight: 800; }
.analytics-project-body { min-width: 0; flex: 1; }
.analytics-project-body>div:first-child { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 9px; }
.analytics-project-body b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; }
.analytics-project-body span { color: #7d7b94; font-size: 10px; }
.notice-strip { display: flex; align-items: flex-start; gap: 12px; margin-top: 18px; padding: 17px; border: 1px solid #e7e1ff; border-radius: 12px; background: #f5f2ff; color: #7766d2; }
.notice-strip b { font-size: 11px; }
.notice-strip p { margin: 5px 0 0; color: #85839d; font-size: 10px; line-height: 1.6; }
.settings-layout { display: flex; flex-direction: column; gap: 18px; max-width: 850px; }
.settings-panel { padding: 23px; }
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 16px 0; border-top: 1px solid #f0f0f5; }
.setting-row b { font-size: 11px; }
.setting-row p { margin: 5px 0 0; color: #89899d; font-size: 10px; line-height: 1.6; }
.setting-value { color: #77778b; font-size: 10px; }
.setting-pill { display: inline-flex; align-items: center; padding: 6px 9px; border-radius: 7px; background: #f1f0f8; color: #77758d; font-size: 9px; font-weight: 700; white-space: nowrap; }
.green-pill { background: #e5f7ed; color: #288d65; }
.yellow-pill { background: #fff3d9; color: #9b732c; }
.settings-body-copy { max-width: 650px; margin: 0 0 18px; color: #88889c; font-size: 11px; line-height: 1.8; }
.danger-outline { color: #bb424b; }
.section-intro { margin-bottom: 20px; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 25px 15px; text-align: center; }
.empty-state-icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: #efedff; color: #7667df; margin-bottom: 10px; }
.empty-state b { font-size: 11px; }
.empty-state p { margin: 6px 0 0; color: #9292a4; font-size: 10px; line-height: 1.6; }
.loading-screen { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: #f8f8fc; color: #77778d; font-size: 12px; }
.loading-screen h2 { margin: 5px 0 0; color: #27273b; font-size: 17px; }
.loading-screen p { margin: 0; }
.spin { animation: spin 1s linear infinite; color: #7667df; }
@keyframes spin { to { transform: rotate(360deg); } }
.modal-backdrop { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; overflow-y: auto; padding: 20px; background: #20203566; backdrop-filter: blur(4px); }
.modal { width: min(100%,510px); max-height: calc(100vh - 40px); overflow-y: auto; padding: 25px; border: 1px solid #eeeef5; border-radius: 17px; background: white; box-shadow: 0 24px 80px #19192d30; }
.modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 15px; margin-bottom: 22px; }
.modal-head h2 { margin: 9px 0 6px; font-size: 20px; letter-spacing: -.5px; }
.modal-head p { margin: 0; color: #89899d; font-size: 11px; }
.modal-form { display: flex; flex-direction: column; gap: 16px; }
.modal-form label { display: flex; flex-direction: column; gap: 7px; color: #5e5e74; font-size: 10px; font-weight: 700; }
.modal-form input, .modal-form select { width: 100%; min-width: 0; padding: 11px 12px; border: 1px solid #e4e4ed; border-radius: 9px; background: white; color: #333348; font-size: 11px; font-weight: 400; }
.modal-form input:focus, .modal-form select:focus { border-color: #a69aef; outline: 0; box-shadow: 0 0 0 3px #7667df12; }
.form-row { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 13px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 9px; padding-top: 8px; }
.toast { position: fixed; right: 25px; bottom: 24px; z-index: 300; display: flex; align-items: center; gap: 10px; max-width: min(440px,calc(100vw - 32px)); padding: 13px 17px; border: 1px solid #e7e7f0; border-radius: 11px; background: white; box-shadow: 0 10px 35px #1d1d321a; color: #44445a; font-size: 11px; line-height: 1.5; }
.toast-check { display: grid; place-items: center; flex: 0 0 23px; width: 23px; height: 23px; border-radius: 7px; background: #e5f7ed; color: #268d65; }
.toast-error .toast-check { background: #fff0e8; color: #bc6241; }
.scrim { position: fixed; inset: 0; z-index: 30; border: 0; background: #1e1e3266; }
.deadline-page { display: flex; flex-direction: column; gap: 20px; }
.deadline-hero { display: flex; align-items: center; justify-content: space-between; gap: 20px; overflow: hidden; position: relative; min-height: 220px; padding: 30px; background: linear-gradient(120deg,#fff,#f3f0ff); }
.deadline-hero-copy { max-width: 650px; position: relative; z-index: 1; }
.deadline-kicker { display: inline-flex; align-items: center; gap: 7px; color: #7062cf; font-size: 10px; font-weight: 800; letter-spacing: .09em; }
.deadline-hero h2 { margin: 12px 0 8px; font-size: clamp(23px,3vw,33px); line-height: 1.18; letter-spacing: -.8px; }
.deadline-hero p { max-width: 600px; margin: 0 0 20px; color: #77778d; line-height: 1.7; font-size: 11px; }
.deadline-hero-art { width: 155px; height: 155px; flex: 0 0 155px; position: relative; display: grid; place-items: center; color: #7769d7; }
.deadline-art-ring { position: absolute; border: 1px solid #7769d733; border-radius: 50%; }
.ring-a { width: 150px; height: 150px; }
.ring-b { width: 112px; height: 112px; border-style: dashed; }
.deadline-art-core { display: grid; place-items: center; width: 68px; height: 68px; border-radius: 22px; background: #dcd6ff; box-shadow: 0 12px 35px #7769d71c; }
.deadline-results { padding: 22px; }
.deadline-service-status { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; padding: 7px 10px; border-radius: 999px; background: #e5f8ed; color: #218458; font-size: 9px; font-weight: 700; }
.deadline-service-status span { width: 6px; height: 6px; border-radius: 50%; background: #22b76b; }
.deadline-error { display: flex; justify-content: space-between; align-items: center; gap: 16px; border: 1px solid #f2caca; background: #fff4f4; border-radius: 12px; padding: 16px; color: #9b3037; }
.deadline-error b { font-size: 11px; }
.deadline-error p { margin: 5px 0 0; font-size: 10px; line-height: 1.6; }
.deadline-summary { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 15px; padding: 13px; border-radius: 10px; background: #f4f1ff; color: #33334a; }
.deadline-summary svg { flex-shrink: 0; color: #7769d7; }
.deadline-summary p { margin: 0; font-size: 11px; line-height: 1.6; }
.deadline-empty { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 34px 18px; }
.deadline-empty h3 { margin: 12px 0 6px; font-size: 14px; }
.deadline-empty p { max-width: 470px; margin: 0 0 18px; color: #818197; font-size: 10px; line-height: 1.7; }
.deadline-empty-icon { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 16px; color: #7769d7; background: #eae6ff; }
.compact-empty { padding: 22px; }
.deadline-loading { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 35px 15px; }
.deadline-loading b { font-size: 11px; }
.deadline-loading p { margin: 4px 0 0; font-size: 10px; color: #818197; }
.deadline-table { min-width: 800px; }
.deadline-risk { display: inline-flex; border-radius: 999px; padding: 5px 8px; font-size: 9px; font-weight: 750; white-space: nowrap; }
.risk-high { background: #fee2e2; color: #b91c1c; }
.risk-medium { background: #fef3c7; color: #92400e; }
.risk-low { background: #dcfce7; color: #166534; }
.risk-unknown { background: #f0eff6; color: #77778d; }
.recommendation-cell { min-width: 230px; max-width: 400px; white-space: normal; font-size: 10px !important; line-height: 1.6; color: #77778d; }
.deadline-raw-response { width: 100%; text-align: left; margin-top: 12px; }
.deadline-raw-response summary { cursor: pointer; font-size: 10px; font-weight: 700; }
.deadline-raw-response pre { max-height: 280px; overflow: auto; padding: 12px; border-radius: 8px; background: #f5f5fa; font-size: 10px; text-align: left; white-space: pre-wrap; overflow-wrap: anywhere; }
.deadline-footnote { display: flex; align-items: flex-start; gap: 10px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 12px; color: #77778d; font-size: 10px; line-height: 1.7; }
.deadline-footnote svg { flex-shrink: 0; color: #7769d7; }
.deadline-footnote b { color: #333348; }
@media (max-width: 1200px) {
  .sidebar { width: 225px; }
  .main-area { margin-left: 225px; }
  .content { padding: 27px 23px; }
  .topbar { padding: 0 23px; }
  .project-cards, .team-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .stats-grid { gap: 10px; }
  .stat-card { padding: 14px; }
}
@media (max-width: 900px) {
  .sidebar { transform: translateX(-100%); transition: transform .22s ease; box-shadow: none; }
  .sidebar.sidebar-open { transform: translateX(0); box-shadow: 15px 0 40px #17172d18; }
  .mobile-close { display: grid; place-items: center; margin-left: auto; border: 0; background: transparent; color: #77778d; }
  .mobile-menu { display: grid; place-items: center; border: 0; background: transparent; color: #55556b; }
  .main-area { margin-left: 0; }
  .topbar { gap: 12px; }
  .overview-grid, .lower-grid { grid-template-columns: minmax(0,1fr); }
  .stats-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .kanban { gap: 9px; }
  .kanban-column { padding: 8px; }
  .kanban-card { padding: 10px; }
  .kanban-card-bottom { align-items: flex-start; }
}
@media (max-width: 600px) {
  .topbar { height: 60px; padding: 0 13px; }
  .breadcrumb { font-size: 10px; }
  .top-actions { gap: 8px; }
  .search-box { width: min(42vw,190px); padding: 8px; }
  .search-box kbd { display: none; }
  .content { padding: 23px 13px; }
  .page-heading { align-items: flex-start; flex-direction: column; margin-bottom: 21px; }
  .page-heading h1 { font-size: 27px; }
  .heading-actions { width: 100%; }
  .heading-actions .button { flex: 1; padding: 10px 8px; }
  .stats-grid { gap: 10px; }
  .stat-card { padding: 13px; }
  .stat-value { font-size: 24px; }
  .panel { padding: 15px; }
  .project-cards, .team-grid, .analytics-grid { grid-template-columns: minmax(0,1fr); }
  .kanban { grid-template-columns: minmax(0,1fr); }
  .kanban-column { padding: 12px; }
  .kanban-card { padding: 13px; }
  .focus-banner { flex-wrap: wrap; padding: 18px; gap: 12px; }
  .focus-art { flex-basis: 50px; height: 50px; }
  .focus-button { width: 100%; }
  .footer { align-items: flex-start; flex-direction: column; line-height: 1.6; }
  .form-row { grid-template-columns: minmax(0,1fr); }
  .modal { padding: 19px; }
  .task-toolbar { flex-wrap: wrap; }
  .task-count { min-width: 100px; }
  .task-toolbar>.button { margin-left: auto; }
  .deadline-hero { padding: 20px; }
  .deadline-hero-art { display: none; }
  .deadline-error { align-items: flex-start; flex-direction: column; }
  .deadline-service-status { display: none; }
  .deadline-results { padding: 15px; }
  .team-summary { align-items: flex-start; flex-wrap: wrap; padding: 15px; }
  .team-count { margin-left: 55px; }
  .timeline-type { display: none; }
  .toast { right: 12px; bottom: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
`;
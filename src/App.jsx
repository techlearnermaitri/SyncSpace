import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AuthScreen from './AuthScreen';
import {
  Activity, ArrowUpRight, Bell, Check, ChevronDown, CircleCheckBig,
  Command, FolderKanban, Gauge, LayoutDashboard, LoaderCircle, LogOut,
  Menu, MoreHorizontal, Plus, Search, Settings, Sparkles, Users, X,
  Zap, UserRound, AlertTriangle
} from 'lucide-react';
import {
  members, statusMeta, todayISO, globalStyles,
  Overview, Projects, Tasks, Team, ActivityPage,
  Analytics, DeadlineIntelligence, SettingsPage
} from './Pages';

const seedProjects = [
  { id: 1, name: 'Campus Sustainability', tag: 'Research', color: '#b8e6c5', initials: 'CS', members: 4 },
  { id: 2, name: 'Smart Attendance System', tag: 'Engineering', color: '#c8c2ff', initials: 'SA', members: 5 },
  { id: 3, name: 'AI Study Companion', tag: 'AI / ML', color: '#ffd7a8', initials: 'AI', members: 3 }
];

const seedTasks = [
  { id: 101, title: 'Finalize research questions', project: 'Campus Sustainability', status: 'done', priority: 'High', due: '2026-10-12', assignee: 'Maitri', initials: 'MM' },
  { id: 102, title: 'Review related work', project: 'Campus Sustainability', status: 'progress', priority: 'Medium', due: '2026-10-16', assignee: 'Aarav', initials: 'AR' },
  { id: 103, title: 'Prepare survey draft', project: 'Campus Sustainability', status: 'todo', priority: 'High', due: '2026-10-17', assignee: 'Maitri', initials: 'MM' },
  { id: 104, title: 'Build authentication flow', project: 'Smart Attendance System', status: 'progress', priority: 'High', due: '2026-10-18', assignee: 'Ishita', initials: 'IS' },
  { id: 105, title: 'Create component library', project: 'AI Study Companion', status: 'done', priority: 'Low', due: '2026-10-10', assignee: 'Kabir', initials: 'KB' },
  { id: 106, title: 'Test mobile layout', project: 'AI Study Companion', status: 'todo', priority: 'Medium', due: '2026-10-19', assignee: 'Maitri', initials: 'MM' },
  { id: 107, title: 'Document API endpoints', project: 'Smart Attendance System', status: 'todo', priority: 'Medium', due: '2026-10-20', assignee: 'Aarav', initials: 'AR' },
  { id: 108, title: 'Run baseline evaluation', project: 'AI Study Companion', status: 'progress', priority: 'High', due: '2026-10-15', assignee: 'Kabir', initials: 'KB' }
];

const initialActivity = [
  { text: 'Maitri completed “Finalize research questions”', time: '2 hours ago', color: 'green' },
  { text: 'Aarav moved “Review related work” to In progress', time: 'Yesterday', color: 'purple' },
  { text: 'Ishita added a new project milestone', time: 'Yesterday', color: 'orange' }
];

const nav = [
  {
    label: 'WORKSPACE',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'projects', label: 'Projects', icon: FolderKanban },
      { id: 'tasks', label: 'My tasks', icon: CircleCheckBig }
    ]
  },
  {
    label: 'MANAGE',
    items: [
      { id: 'team', label: 'Team', icon: Users },
      { id: 'activity', label: 'Activity', icon: Activity },
      { id: 'analytics', label: 'Analytics', icon: Gauge },
      { id: 'deadline-intelligence', label: 'Deadline Intelligence', icon: Zap }
    ]
  }
];

const localKey = (uid, key) => `syncspace:${uid}:${key}`;

function readLocal(uid, key, fallback) {
  try {
    const raw = localStorage.getItem(localKey(uid, key));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function Dashboard({ user }) {
  const [active, setActive] = useState('overview');
  const [projects, setProjects] = useState(() => readLocal(user.uid, 'projects', seedProjects));
  const [tasks, setTasks] = useState(() => readLocal(user.uid, 'tasks', seedTasks));
  const [activity, setActivity] = useState(() => readLocal(user.uid, 'activity', initialActivity));
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('Connecting');
  const [query, setQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('All projects');
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', project: '', status: 'todo', priority: 'Medium',
    due: `${todayISO()}`, assignee: 'Maitri'
  });
  const [newProject, setNewProject] = useState({ name: '', tag: 'Course project' });
  const [deadlineReport, setDeadlineReport] = useState(null);
  const [deadlineLoading, setDeadlineLoading] = useState(false);
  const [deadlineError, setDeadlineError] = useState('');

  const notify = (message, isError = false) => {
    setToast(message);
    setToastError(isError);
    window.setTimeout(() => setToast(''), 3500);
  };

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.querySelector('.search-box input')?.focus();
      }
      if (event.key === 'Escape') {
        setModal(null);
        setMenuOpen(false);
        setProfileOpen(false);
        setWorkspaceOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      setCloudReady(false);
      setCloudStatus('Connecting');

      try {
        const ref = doc(db, 'users', user.uid, 'workspace', 'data');
        const snapshot = await getDoc(ref);
        if (cancelled) return;

        if (snapshot.exists()) {
          const data = snapshot.data();
          const nextProjects = Array.isArray(data.projects) ? data.projects : seedProjects;
          const nextTasks = Array.isArray(data.tasks) ? data.tasks : seedTasks;
          const nextActivity = Array.isArray(data.activity) ? data.activity : initialActivity;

          setProjects(nextProjects);
          setTasks(nextTasks);
          setActivity(nextActivity);

          try {
            localStorage.setItem(localKey(user.uid, 'projects'), JSON.stringify(nextProjects));
            localStorage.setItem(localKey(user.uid, 'tasks'), JSON.stringify(nextTasks));
            localStorage.setItem(localKey(user.uid, 'activity'), JSON.stringify(nextActivity));
          } catch (error) {
            console.warn('Local cache unavailable:', error);
          }
        } else {
          // Only migrate this account's cache, never another user's data.
          const localProjects = readLocal(user.uid, 'projects', seedProjects);
          const localTasks = readLocal(user.uid, 'tasks', seedTasks);
          const localActivity = readLocal(user.uid, 'activity', initialActivity);

          await setDoc(ref, {
            projects: localProjects,
            tasks: localTasks,
            activity: localActivity,
            updatedAt: new Date().toISOString()
          });

          if (cancelled) return;
          setProjects(localProjects);
          setTasks(localTasks);
          setActivity(localActivity);
        }

        if (!cancelled) setCloudStatus('Synced');
      } catch (error) {
        console.error('Workspace load failed:', error);
        if (!cancelled) {
          setCloudStatus('Offline');
          notify('Cloud connection failed. Changes may only be saved locally.', true);
        }
      } finally {
        if (!cancelled) setCloudReady(true);
      }
    }

    loadWorkspace();
    return () => { cancelled = true; };
  }, [user.uid]);

  const persist = async (p, t, a) => {
    try {
      localStorage.setItem(localKey(user.uid, 'projects'), JSON.stringify(p));
      localStorage.setItem(localKey(user.uid, 'tasks'), JSON.stringify(t));
      localStorage.setItem(localKey(user.uid, 'activity'), JSON.stringify(a));
    } catch (error) {
      console.warn('Local save failed:', error);
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid, 'workspace', 'data'), {
        projects: p,
        tasks: t,
        activity: a,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setCloudStatus('Synced');
    } catch (error) {
      console.error('Cloud save failed:', error);
      setCloudStatus('Offline');
      notify('Saved locally, but cloud sync failed. Check your connection and Firestore rules.', true);
    } finally {
      setSaving(false);
    }
  };

  const recordActivity = (message, color = 'purple') => [
    { text: message, time: 'Just now', color },
    ...activity
  ].slice(0, 12);

  const done = tasks.filter(t => t.status === 'done').length;
  const activeTasks = tasks.filter(t => t.status !== 'done').length;
  const overdue = tasks.filter(t => t.status !== 'done' && t.due && t.due < todayISO()).length;

  const filteredTasks = useMemo(() => tasks.filter(task =>
    (projectFilter === 'All projects' || task.project === projectFilter) &&
    `${task.title} ${task.project} ${task.assignee} ${task.priority}`
      .toLowerCase().includes(query.trim().toLowerCase())
  ), [tasks, projectFilter, query]);

  const navigate = (page) => {
    setActive(page);
    setMenuOpen(false);
    setProfileOpen(false);
    setWorkspaceOpen(false);
  };

  const moveTask = (task, status) => {
    if (!statusMeta[status]) return;
    const nextTasks = tasks.map(item => item.id === task.id ? { ...item, status } : item);
    const nextActivity = recordActivity(`Moved “${task.title}” to ${statusMeta[status].label}`, status === 'done' ? 'green' : 'purple');
    setTasks(nextTasks);
    setActivity(nextActivity);
    persist(projects, nextTasks, nextActivity);
    notify('Task updated');
  };

  const deleteTask = (task) => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    const nextTasks = tasks.filter(item => item.id !== task.id);
    const nextActivity = recordActivity(`Deleted task “${task.title}”`, 'orange');
    setTasks(nextTasks);
    setActivity(nextActivity);
    persist(projects, nextTasks, nextActivity);
    notify('Task deleted');
  };

  const deleteProject = (project) => {
    if (!window.confirm(`Delete "${project.name}" and all its tasks? This cannot be undone.`)) return;

    const nextProjects = projects.filter(p => p.id !== project.id);
    const nextTasks = tasks.filter(t => t.project !== project.name);
    const nextActivity = recordActivity(`Deleted project “${project.name}” and its tasks`, 'orange');

    setProjects(nextProjects);
    setTasks(nextTasks);
    setActivity(nextActivity);
    setProjectFilter('All projects');
    setNewTask(current => ({ ...current, project: nextProjects[0]?.name || '' }));
    if (active === 'tasks' && nextProjects.length === 0) setActive('projects');

    persist(nextProjects, nextTasks, nextActivity);
    notify('Project and its tasks deleted');
  };

  const createTask = (event) => {
    event.preventDefault();
    const title = newTask.title.trim();
    if (!title) return;
    if (!projects.length) {
      notify('Create a project before adding tasks', true);
      setModal('project');
      return;
    }

    const projectName = projects.some(p => p.name === newTask.project)
      ? newTask.project : projects[0].name;
    const person = members.find(m => m.name.split(' ')[0] === newTask.assignee) || members[0];

    const task = {
      ...newTask,
      id: Date.now(),
      title,
      project: projectName,
      initials: person.initials
    };
    const nextTasks = [task, ...tasks];
    const nextActivity = recordActivity(`Created “${title}” in ${projectName}`, 'green');

    setTasks(nextTasks);
    setActivity(nextActivity);
    setModal(null);
    setNewTask({
      title: '', project: projectName, status: 'todo', priority: 'Medium',
      due: todayISO(), assignee: 'Maitri'
    });
    persist(projects, nextTasks, nextActivity);
    notify('Task created');
  };

  const createProject = (event) => {
    event.preventDefault();
    const name = newProject.name.trim();
    if (!name) return;

    if (projects.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      notify('A project with this name already exists', true);
      return;
    }

    const colors = ['#b8e6c5', '#c8c2ff', '#ffd7a8', '#ffc4d7'];
    const project = {
      id: Date.now(),
      name,
      tag: newProject.tag,
      color: colors[projects.length % colors.length],
      initials: name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(),
      members: 1
    };

    const nextProjects = [...projects, project];
    const nextActivity = recordActivity(`Created project “${name}”`, 'green');

    setProjects(nextProjects);
    setActivity(nextActivity);
    setNewTask(current => ({ ...current, project: current.project || name }));
    setNewProject({ name: '', tag: 'Course project' });
    setModal(null);
    persist(nextProjects, tasks, nextActivity);
    notify('Project created');
  };

  const restoreDemoData = async () => {
    if (!window.confirm('Replace your current workspace with the original demo data?')) return;
    setProjects(seedProjects);
    setTasks(seedTasks);
    setActivity(initialActivity);
    setProjectFilter('All projects');
    setQuery('');
    await persist(seedProjects, seedTasks, initialActivity);
    notify('Demo data restored');
  };

  const analyzeDeadlines = async () => {
    setDeadlineLoading(true);
    setDeadlineError('');

    try {
      const response = await fetch(
        'https://syncspace-deadline-api.maitri-more-btech2028.workers.dev/analyze',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tasks: tasks.map(task => ({
              id: task.id,
              title: task.title,
              project: task.project,
              priority: task.priority,
              dueDate: task.due,
              status: task.status === 'done' ? 'Done' : task.status === 'progress' ? 'In Progress' : 'To Do'
            }))
          })
        }
      );

      if (!response.ok) throw new Error(`Analysis service returned HTTP ${response.status}`);

      const result = await response.json();
      let report = result;

      if (typeof result.output === 'string') {
        try {
          report = JSON.parse(result.output);
        } catch {
          throw new Error('The service returned invalid JSON.');
        }
      } else if (result.output && typeof result.output === 'object') {
        report = result.output;
      }

      if (report.success === false || result.success === false) {
        throw new Error(report.error || result.error || 'Analysis failed.');
      }

      setDeadlineReport(report);
      notify('Deadline analysis completed');
    } catch (error) {
      console.error('Deadline analysis failed:', error);
      setDeadlineError(error.message || 'Could not reach the analysis service. Check the endpoint, deployment and CORS settings.');
    } finally {
      setDeadlineLoading(false);
    }
  };

  const pageTitles = {
    overview: ['Your workspace, in focus', `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}`, 'Here’s what’s happening across your workspace.'],
    projects: ['PLAN & BUILD', 'Your projects', 'Keep every project moving in the right direction.'],
    tasks: ['YOUR WORKFLOW', 'My tasks', 'A clear view of what needs your attention.'],
    team: ['PEOPLE & COLLABORATION', 'Your team', 'The people building great things together.'],
    activity: ['WORKSPACE HISTORY', 'Activity', 'A trail of your team’s progress.'],
    analytics: ['INSIGHTS & PROGRESS', 'Analytics', 'Understand progress at a glance.'],
    'deadline-intelligence': ['SMARTER PLANNING', 'Deadline Intelligence', 'Spot deadline risks before they become problems.'],
    settings: ['PREFERENCES', 'Settings', 'Manage your workspace and account.']
  };

  if (!cloudReady) {
    return (
      <div className="loading-screen">
        <div className="loading-logo"><Command size={24} /></div>
        <LoaderCircle className="spin" size={22} />
        <h2>Preparing your workspace</h2>
        <p>Connecting to your secure cloud workspace…</p>
        <style>{globalStyles}</style>
      </div>
    );
  }

  const [eyebrow, title, subtitle] = pageTitles[active] || pageTitles.overview;

  return (
    <div className="app-shell">
      <style>{globalStyles}</style>

      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Command size={20} strokeWidth={2.5} /></div>
          <span>syncspace<span className="brand-period">.</span></span>
          <button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <div className="workspace-wrap">
          <button className="workspace-switch" onClick={() => { setWorkspaceOpen(!workspaceOpen); setProfileOpen(false); }}>
            <div className="workspace-avatar">U</div>
            <div className="workspace-name"><b>UGDX Workspace</b><span>Personal workspace</span></div>
            <ChevronDown size={15} />
          </button>
          {workspaceOpen && (
            <div className="action-dropdown workspace-dropdown">
              <button onClick={() => navigate('overview')}><LayoutDashboard size={15} /> Overview</button>
              <button onClick={() => navigate('projects')}><FolderKanban size={15} /> Projects</button>
              <button onClick={() => navigate('settings')}><Settings size={15} /> Settings</button>
            </div>
          )}
        </div>

        <div className="nav-scroll">
          {nav.map(group => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}>
                    <Icon size={17} /><span>{item.label}</span>
                    {item.id === 'tasks' && activeTasks > 0 && <span className="nav-count">{activeTasks}</span>}
                  </button>
                );
              })}
            </div>
          ))}

          <div className="nav-group">
            <div className="nav-label nav-label-row">YOUR PROJECTS<button className="tiny-add" onClick={() => setModal('project')} aria-label="Add project"><Plus size={14} /></button></div>
            {projects.slice(0, 6).map(project => (
              <button key={project.id} className="project-nav" onClick={() => { setProjectFilter(project.name); navigate('tasks'); }}>
                <span className="project-dot" style={{ background: project.color }} /><span>{project.name}</span>
              </button>
            ))}
            {!projects.length && <p className="sidebar-empty">No projects yet</p>}
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><Sparkles size={17} /></div>
            <b>Make space for great work</b>
            <p>Small steps. Big outcomes. Keep your team in sync.</p>
            <button onClick={() => navigate('analytics')}>Explore your progress <ArrowUpRight size={14} /></button>
          </div>
          <button className={`nav-item ${active === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}><Settings size={17} /><span>Settings</span></button>
          <div className="profile-wrap">
            <button className="profile" onClick={() => { setProfileOpen(!profileOpen); setWorkspaceOpen(false); }}>
              <div className="avatar avatar-purple">{(user.displayName || 'U').split(' ').map(v => v[0]).slice(0, 2).join('').toUpperCase()}</div>
              <div className="profile-text"><b>{user.displayName || 'Your account'}</b><span>{user.email}</span></div>
              <MoreHorizontal size={18} />
            </button>
            {profileOpen && (
              <div className="action-dropdown profile-dropdown">
                <div className="dropdown-heading"><b>{user.displayName || 'Your account'}</b><span>{user.email}</span></div>
                <button onClick={() => navigate('settings')}><UserRound size={15} /> Account settings</button>
                <button onClick={async () => {
                  try {
                    await signOut(auth);
                  } catch (error) {
                    console.error(error);
                    notify('Could not sign out. Please retry.', true);
                  }
                }}><LogOut size={15} /> Sign out</button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="breadcrumb">Workspace <span>/</span> <b>{title}</b></div>
          <div className="top-actions">
            <div className="search-box">
              <Search size={16} />
              <input placeholder="Search tasks..." value={query} onChange={e => {
                setQuery(e.target.value);
                if (e.target.value.trim()) setActive('tasks');
              }} />
              {query ? <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button> : <kbd>⌘ K</kbd>}
            </div>
            <button className="icon-button" onClick={() => navigate('activity')} aria-label="View activity"><Bell size={18} /></button>
            <button className="top-avatar" onClick={() => { setProfileOpen(!profileOpen); setWorkspaceOpen(false); }} aria-label="Open profile">{(user.displayName || 'U').split(' ').map(v => v[0]).slice(0, 2).join('').toUpperCase()}</button>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="live-dot" /> {eyebrow}</div>
              <h1>{title}{active === 'overview' && <span className="wave"> ✨</span>}</h1>
              <p>{subtitle}</p>
            </div>
            <div className="heading-actions">
              <button className="button button-secondary" onClick={() => setModal('project')}><Plus size={16} /> New project</button>
              <button className="button button-primary" onClick={() => {
                if (!projects.length) {
                  notify('Create a project before adding tasks', true);
                  setModal('project');
                } else {
                  setNewTask(t => ({ ...t, project: projects.some(p => p.name === t.project) ? t.project : projects[0].name }));
                  setModal('task');
                }
              }}><Plus size={16} /> New task</button>
            </div>
          </div>

          {active === 'overview' && <Overview projects={projects} tasks={tasks} done={done} activeTasks={activeTasks} overdue={overdue} activity={activity} onMove={moveTask} onPage={navigate} onNewTask={() => setModal('task')} />}
          {active === 'projects' && <Projects projects={projects} tasks={tasks} onNew={() => setModal('project')} onOpen={name => { setProjectFilter(name); navigate('tasks'); }} onDelete={deleteProject} />}
          {active === 'tasks' && <Tasks tasks={filteredTasks} projects={projects} projectFilter={projectFilter} setProjectFilter={setProjectFilter} onMove={moveTask} onNew={() => {
            if (!projects.length) { setModal('project'); notify('Create a project first', true); }
            else setModal('task');
          }} onDelete={deleteTask} />}
          {active === 'team' && <Team tasks={tasks} />}
          {active === 'activity' && <ActivityPage activity={activity} />}
          {active === 'analytics' && <Analytics projects={projects} tasks={tasks} />}
          {active === 'deadline-intelligence' && <DeadlineIntelligence tasks={tasks} report={deadlineReport} loading={deadlineLoading} error={deadlineError} onAnalyze={analyzeDeadlines} />}
          {active === 'settings' && <SettingsPage user={user} cloudStatus={cloudStatus} onReset={restoreDemoData} />}

          <footer className="footer">
            <span>Made for teams who make things happen.</span>
            <span className="footer-status"><i className={cloudStatus === 'Synced' ? 'online' : 'offline'} /> {saving ? 'Saving changes…' : cloudStatus} <span className="footer-sep">·</span> Firebase · Cloudflare Workers</span>
          </footer>
        </div>
      </main>

      {modal && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <div className="modal-head">
              <div><div className="eyebrow">WORKSPACE</div><h2>{modal === 'task' ? 'Create a new task' : 'Create a project'}</h2><p>{modal === 'task' ? 'Make the next step clear.' : 'Give your team a place to focus.'}</p></div>
              <button className="icon-button" onClick={() => setModal(null)} aria-label="Close dialog"><X size={18} /></button>
            </div>
            {modal === 'task' ? (
              <form className="modal-form" onSubmit={createTask}>
                <label>Task name<input autoFocus required maxLength={160} placeholder="e.g. Prepare project presentation" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} /></label>
                <div className="form-row">
                  <label>Project<select required value={newTask.project} onChange={e => setNewTask({ ...newTask, project: e.target.value })}>{projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></label>
                  <label>Assignee<select value={newTask.assignee} onChange={e => setNewTask({ ...newTask, assignee: e.target.value })}>{members.map(m => <option key={m.initials} value={m.name.split(' ')[0]}>{m.name.split(' ')[0]}</option>)}</select></label>
                </div>
                <div className="form-row">
                  <label>Priority<select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></label>
                  <label>Due date<input type="date" value={newTask.due} onChange={e => setNewTask({ ...newTask, due: e.target.value })} /></label>
                </div>
                <label>Status<select value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value })}><option value="todo">To do</option><option value="progress">In progress</option><option value="done">Done</option></select></label>
                <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary" type="submit"><Plus size={15} /> Create task</button></div>
              </form>
            ) : (
              <form className="modal-form" onSubmit={createProject}>
                <label>Project name<input autoFocus required maxLength={100} placeholder="e.g. Campus Innovation Lab" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} /></label>
                <label>Project type<select value={newProject.tag} onChange={e => setNewProject({ ...newProject, tag: e.target.value })}><option>Course project</option><option>Research</option><option>Engineering</option><option>AI / ML</option><option>Hackathon</option><option>Student club</option></select></label>
                <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary" type="submit"><Plus size={15} /> Create project</button></div>
              </form>
            )}
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toastError ? 'toast-error' : ''}`}><span className="toast-check">{toastError ? <AlertTriangle size={14} /> : <Check size={14} />}</span>{toast}</div>}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) return <><style>{globalStyles}</style><div className="loading-screen"><LoaderCircle className="spin" size={25} /><p>Loading SyncSpace…</p></div></>;
  if (!user) return <AuthScreen />;
  return <Dashboard key={user.uid} user={user} />;
}

export default App;
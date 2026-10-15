
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import AuthScreen from './AuthScreen';
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, CalendarDays, Check,
  ChevronDown, CircleHelp, Clock3, Command, Filter, FolderKanban, Gauge,
  LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Search, Settings,
  Sparkles, Users, X, Zap, CircleCheckBig, CircleDot, CircleDashed,
  Trash2, UserRound, Building2
} from 'lucide-react';

const seedProjects = [
  { id: 1, name: 'Campus Sustainability', tag: 'Research', color: '#b8e6c5', initials: 'CS', members: 4, progress: 72, tasks: 11 },
  { id: 2, name: 'Smart Attendance System', tag: 'Engineering', color: '#c8c2ff', initials: 'SA', members: 5, progress: 46, tasks: 15 },
  { id: 3, name: 'AI Study Companion', tag: 'AI / ML', color: '#ffd7a8', initials: 'AI', members: 3, progress: 88, tasks: 8 },
];

const seedTasks = [
  { id: 101, title: 'Finalize research questions', project: 'Campus Sustainability', status: 'done', priority: 'High', due: '2026-10-12', assignee: 'Maitri', initials: 'MM' },
  { id: 102, title: 'Review related work', project: 'Campus Sustainability', status: 'progress', priority: 'Medium', due: '2026-10-16', assignee: 'Aarav', initials: 'AR' },
  { id: 103, title: 'Prepare survey draft', project: 'Campus Sustainability', status: 'todo', priority: 'High', due: '2026-10-17', assignee: 'Maitri', initials: 'MM' },
  { id: 104, title: 'Build authentication flow', project: 'Smart Attendance System', status: 'progress', priority: 'High', due: '2026-10-18', assignee: 'Ishita', initials: 'IS' },
  { id: 105, title: 'Create component library', project: 'AI Study Companion', status: 'done', priority: 'Low', due: '2026-10-10', assignee: 'Kabir', initials: 'KB' },
  { id: 106, title: 'Test mobile layout', project: 'AI Study Companion', status: 'todo', priority: 'Medium', due: '2026-10-19', assignee: 'Maitri', initials: 'MM' },
  { id: 107, title: 'Document API endpoints', project: 'Smart Attendance System', status: 'todo', priority: 'Medium', due: '2026-10-20', assignee: 'Aarav', initials: 'AR' },
  { id: 108, title: 'Run baseline evaluation', project: 'AI Study Companion', status: 'progress', priority: 'High', due: '2026-10-15', assignee: 'Kabir', initials: 'KB' },
];

const members = [
  { name: 'Maitri More', role: 'Project lead', initials: 'MM', color: '#c8c2ff', tasks: 6 },
  { name: 'Aarav Rao', role: 'Developer', initials: 'AR', color: '#b8e6c5', tasks: 4 },
  { name: 'Ishita Shah', role: 'Designer', initials: 'IS', color: '#ffd7a8', tasks: 3 },
  { name: 'Kabir Bansal', role: 'ML engineer', initials: 'KB', color: '#ffc4d7', tasks: 5 },
];

const nav = [
  {
    label: 'Workspace',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'projects', label: 'Projects', icon: FolderKanban },
      { id: 'tasks', label: 'My tasks', icon: CircleCheckBig },
    ],
  },
  {
    label: 'Manage',
    items: [
      { id: 'team', label: 'Team', icon: Users },
      { id: 'activity', label: 'Activity', icon: Activity },
      { id: 'analytics', label: 'Analytics', icon: Gauge },
      { id: 'deadline-intelligence', label: 'Deadline Intelligence', icon: Zap },
    ],
  },
];

const initialActivity = [
  { text: 'Maitri completed “Finalize research questions”', time: '2 hours ago', color: 'green' },
  { text: 'Aarav moved “Review related work” to In progress', time: 'Yesterday', color: 'purple' },
  { text: 'Ishita added a new project milestone', time: 'Yesterday', color: 'orange' },
];

const statusMeta = {
  todo: { label: 'To do', icon: CircleDashed, cls: 'todo' },
  progress: { label: 'In progress', icon: CircleDot, cls: 'progress' },
  done: { label: 'Done', icon: CircleCheckBig, cls: 'done' },
};

const toLocalISODate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const read = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

function Dashboard({ user }) {
  const [active, setActive] = useState('overview');
  const [projects, setProjects] = useState(() => read('ss-projects', seedProjects));
  const [tasks, setTasks] = useState(() => read('ss-tasks', seedTasks));
  const [activity, setActivity] = useState(() => read('ss-activity', initialActivity));
  const [cloudReady, setCloudReady] = useState(false);


const [deadlineReport, setDeadlineReport] = useState(null);
const [deadlineLoading, setDeadlineLoading] = useState(false);
const [deadlineError, setDeadlineError] = useState('');

const analyzeDeadlines = async () => {
  setDeadlineLoading(true);
  setDeadlineError('');

  try {
    const response = await fetch(
      'https://syncspace-60090576328.development.catalystserverless.in/server/deadline_intelligence/execute',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: tasks.map((task) => ({
            id: task.id,
            title: task.title,
            project: task.project,
            priority: task.priority,
            dueDate: task.due,
            status:
              task.status === 'done'
                ? 'Done'
                : task.status === 'progress'
                  ? 'In Progress'
                  : 'To Do',
          })),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Catalyst returned HTTP ${response.status}`);
    }

    const result = await response.json();

    // Catalyst deployments may return the function payload directly or wrap it
    // in an "output" string/object.
    let report = result;
    if (typeof result.output === 'string') {
      try {
        report = JSON.parse(result.output);
      } catch {
        throw new Error('Catalyst returned an output string that was not valid JSON.');
      }
    } else if (result.output && typeof result.output === 'object') {
      report = result.output;
    }

    if (report.success === false || result.success === false) {
      throw new Error(report.error || result.error || 'Deadline analysis failed.');
    }

    setDeadlineReport(report);
  } catch (error) {
    console.error('Deadline intelligence error:', error);
    setDeadlineError(
      'Could not reach the analysis service. Check the function URL, deployment and CORS settings.'
    );
  } finally {
    setDeadlineLoading(false);
  }
};

  const [query, setQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('All projects');
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [newTask, setNewTask] = useState({
    title: '',
    project: 'Campus Sustainability',
    status: 'todo',
    priority: 'Medium',
    due: toLocalISODate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
    assignee: 'Maitri',
  });
  const [newProject, setNewProject] = useState({
    name: '',
    tag: 'Course project',
  });

  const persist = async (p, t, a) => {
    // Keep a local fallback, while also saving this user's workspace to Firestore.
    try {
      localStorage.setItem('ss-projects', JSON.stringify(p));
      localStorage.setItem('ss-tasks', JSON.stringify(t));
      localStorage.setItem('ss-activity', JSON.stringify(a));
    } catch (error) {
      console.error('Could not save SyncSpace data locally:', error);
    }

    if (!user?.uid) return;

    try {
      await setDoc(doc(db, 'users', user.uid, 'workspace', 'data'), {
        projects: p,
        tasks: t,
        activity: a,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.error('Could not save SyncSpace data to Firestore:', error);
      notify('Saved in this browser, but cloud save failed. Check Firestore rules and connection.');
    }
  };

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  // Load this signed-in user's cloud data. On first sign-in, migrate existing
  // browser data to Firestore so the current demo workspace is not discarded.
  useEffect(() => {
    let cancelled = false;

    const loadWorkspace = async () => {
      setCloudReady(false);
      try {
        const workspaceRef = doc(db, 'users', user.uid, 'workspace', 'data');
        const snapshot = await getDoc(workspaceRef);
        if (cancelled) return;

        if (snapshot.exists()) {
          const cloudData = snapshot.data();
          const nextProjects = Array.isArray(cloudData.projects) ? cloudData.projects : seedProjects;
          const nextTasks = Array.isArray(cloudData.tasks) ? cloudData.tasks : seedTasks;
          const nextActivity = Array.isArray(cloudData.activity) ? cloudData.activity : initialActivity;
          setProjects(nextProjects);
          setTasks(nextTasks);
          setActivity(nextActivity);
          try {
            localStorage.setItem('ss-projects', JSON.stringify(nextProjects));
            localStorage.setItem('ss-tasks', JSON.stringify(nextTasks));
            localStorage.setItem('ss-activity', JSON.stringify(nextActivity));
          } catch (storageError) {
            console.warn('Could not update local cache:', storageError);
          }
        } else {
          const localProjects = read('ss-projects', seedProjects);
          const localTasks = read('ss-tasks', seedTasks);
          const localActivity = read('ss-activity', initialActivity);
          setProjects(localProjects);
          setTasks(localTasks);
          setActivity(localActivity);
          await setDoc(workspaceRef, {
            projects: localProjects,
            tasks: localTasks,
            activity: localActivity,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Could not load SyncSpace cloud workspace:', error);
        if (!cancelled) {
          notify('Could not connect to cloud storage. Your browser data is still available.');
        }
      } finally {
        if (!cancelled) setCloudReady(true);
      }
    };

    if (user?.uid) loadWorkspace();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const log = (text, color = 'purple') => {
    const nextActivity = [
      { text, time: 'Just now', color },
      ...activity,
    ].slice(0, 8);

    setActivity(nextActivity);
    persist(projects, tasks, nextActivity);
  };

  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          (projectFilter === 'All projects' ||
            task.project === projectFilter) &&
          `${task.title} ${task.project} ${task.assignee}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [tasks, query, projectFilter]
  );

  const done = tasks.filter((task) => task.status === 'done').length;
  const activeTasks = tasks.filter((task) => task.status !== 'done').length;
  const todayISO = toLocalISODate();
  const overdue = tasks.filter(
    (task) => task.status !== 'done' && task.due && task.due < todayISO
  ).length;

  const moveTask = (task, status) => {
    const nextTasks = tasks.map((item) =>
      item.id === task.id ? { ...item, status } : item
    );

    const nextActivity = [
      {
        text: `Moved “${task.title}” to ${statusMeta[status].label}`,
        time: 'Just now',
        color: status === 'done' ? 'green' : 'purple',
      },
      ...activity,
    ].slice(0, 8);

    setTasks(nextTasks);
    setActivity(nextActivity);
    persist(projects, nextTasks, nextActivity);
    notify('Task updated');
  };

  const deleteTask = (task) => {
    const confirmed = window.confirm(
      `Delete "${task.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    const nextTasks = tasks.filter((item) => item.id !== task.id);
    const nextActivity = [
      {
        text: `Deleted task “${task.title}”`,
        time: 'Just now',
        color: 'orange',
      },
      ...activity,
    ].slice(0, 8);

    setTasks(nextTasks);
    setActivity(nextActivity);
    persist(projects, nextTasks, nextActivity);
    notify('Task deleted');
  };

  const deleteProject = (project) => {
    const confirmed = window.confirm(
      `Delete "${project.name}" and all tasks belonging to it? This cannot be undone.`
    );

    if (!confirmed) return;

    const nextProjects = projects.filter(
      (item) => item.id !== project.id
    );

    const nextTasks = tasks.filter(
      (task) => task.project !== project.name
    );

    const nextActivity = [
      {
        text: `Deleted project “${project.name}” and its tasks`,
        time: 'Just now',
        color: 'orange',
      },
      ...activity,
    ].slice(0, 8);

    setProjects(nextProjects);
    setTasks(nextTasks);
    setActivity(nextActivity);

    persist(nextProjects, nextTasks, nextActivity);

    if (projectFilter === project.name) {
      setProjectFilter('All projects');
    }

    setNewTask((current) => ({
      ...current,
      project: nextProjects[0]?.name || '',
    }));

    if (active === 'tasks' && nextProjects.length === 0) {
      setActive('projects');
    }

    notify('Project and its tasks deleted');
  };

  const createTask = (event) => {
    event.preventDefault();

    if (!newTask.title.trim()) return;

    if (!projects.length) {
      notify('Create a project before adding tasks');
      return;
    }

    const projectExists = projects.some(
      (project) => project.name === newTask.project
    );

    const selectedProject = projectExists
      ? newTask.project
      : projects[0].name;

    const person =
      members.find((member) =>
        member.name.startsWith(newTask.assignee)
      ) || members[0];

    const task = {
      ...newTask,
      project: selectedProject,
      id: Date.now(),
      title: newTask.title.trim(),
      initials: person.initials,
    };

    const nextTasks = [task, ...tasks];

    const nextActivity = [
      {
        text: `Created “${task.title}” in ${task.project}`,
        time: 'Just now',
        color: 'green',
      },
      ...activity,
    ].slice(0, 8);

    setTasks(nextTasks);
    setActivity(nextActivity);
    persist(projects, nextTasks, nextActivity);

    setModal(null);

    setNewTask({
      title: '',
      project: selectedProject,
      status: 'todo',
      priority: 'Medium',
      due: toLocalISODate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
      assignee: 'Maitri',
    });

    notify('Task created successfully');
  };

  const createProject = (event) => {
    event.preventDefault();

    const name = newProject.name.trim();

    if (!name) return;

    if (
      projects.some(
        (project) => project.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      notify('A project with this name already exists');
      return;
    }

    const colors = ['#b8e6c5', '#c8c2ff', '#ffd7a8', '#ffc4d7'];

    const project = {
      id: Date.now(),
      name,
      tag: newProject.tag,
      color: colors[projects.length % colors.length],
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase(),
      members: 1,
      progress: 0,
      tasks: 0,
    };

    const nextProjects = [...projects, project];

    const nextActivity = [
      {
        text: `Created project “${project.name}”`,
        time: 'Just now',
        color: 'green',
      },
      ...activity,
    ].slice(0, 8);

    setProjects(nextProjects);
    setActivity(nextActivity);
    persist(nextProjects, tasks, nextActivity);

    setModal(null);
    setNewProject({ name: '', tag: 'Course project' });

    setNewTask((current) => ({
      ...current,
      project: current.project || project.name,
    }));

    notify('Project created');
  };

  const restoreDemoData = () => {
    const confirmed = window.confirm(
      'Restore the original demo projects, tasks and activity? Your current local changes will be lost.'
    );

    if (!confirmed) return;

    setProjects(seedProjects);
    setTasks(seedTasks);
    setActivity(initialActivity);
    setProjectFilter('All projects');
    setQuery('');

    persist(seedProjects, seedTasks, initialActivity);
    notify('Demo data restored');
  };

  const pageTitle = {
    overview: 'Good evening, Maitri',
    projects: 'Your projects',
    tasks: 'My tasks',
    team: 'Your team',
    activity: 'Activity',
    analytics: 'Analytics',
    'deadline-intelligence': 'Deadline Intelligence',
    settings: 'Settings',
  }[active] || 'Workspace';

  const subtitle = {
    overview: 'Here’s what’s happening across your workspace.',
    projects: 'Keep every project moving in the right direction.',
    tasks: 'A clear view of what needs your attention.',
    team: 'The people building great things together.',
    activity: 'A live-ish trail of your team’s progress.',
    analytics: 'Understand progress at a glance.',
    'deadline-intelligence': 'Spot deadline risks early and decide what needs attention first.',
    settings: 'Manage your workspace preferences.',
  }[active];

  const navigate = (page) => {
    setActive(page);
    setMenuOpen(false);
    setProfileOpen(false);
    setWorkspaceOpen(false);
  };

  if (!cloudReady) {
    return <p style={{ padding: 24 }}>Loading your SyncSpace cloud workspace...</p>;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Command size={19} strokeWidth={2.5} />
          </div>
          <span>syncspace</span>
          <button
            className="mobile-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            className="workspace-switch"
            type="button"
            aria-expanded={workspaceOpen}
            onClick={() => {
              setWorkspaceOpen((open) => !open);
              setProfileOpen(false);
            }}
          >
            <div className="workspace-avatar">U</div>
            <div className="workspace-name">
              <b>UGDX Workspace</b>
              <span>Free workspace</span>
            </div>
            <ChevronDown size={15} />
          </button>

          {workspaceOpen && (
            <div className="action-dropdown workspace-dropdown">
              <button
                type="button"
                onClick={() => navigate('overview')}
              >
                <LayoutDashboard size={15} /> Overview
              </button>
              <button
                type="button"
                onClick={() => navigate('projects')}
              >
                <FolderKanban size={15} /> Projects
              </button>
              <button
                type="button"
                onClick={() => navigate('settings')}
              >
                <Settings size={15} /> Workspace settings
              </button>
            </div>
          )}
        </div>

        <div className="nav-scroll">
          {nav.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>

              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${
                    active === item.id ? 'active' : ''
                  }`}
                  onClick={() => navigate(item.id)}
                >
                  <item.icon size={17} />
                  <span>{item.label}</span>
                  {item.id === 'tasks' && (
                    <span className="nav-count">{activeTasks}</span>
                  )}
                </button>
              ))}
            </div>
          ))}

          <div className="nav-group">
            <div className="nav-label">
              Your projects
              <button
                className="tiny-add"
                onClick={() => setModal('project')}
                aria-label="Add project"
              >
                <Plus size={14} />
              </button>
            </div>

            {projects.slice(0, 5).map((project) => (
              <button
                className="project-nav"
                key={project.id}
                onClick={() => {
                  setProjectFilter(project.name);
                  navigate('tasks');
                }}
              >
                <span
                  className="project-dot"
                  style={{ background: project.color }}
                />
                <span>{project.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon">
              <Sparkles size={16} />
            </div>
            <b>Make space for great work</b>
            <p>Small steps. Big outcomes. Keep your team in sync.</p>
            <button
              onClick={() =>
                notify('You’re already on the free demo workspace.')
              }
            >
              Explore workspace <ArrowUpRight size={14} />
            </button>
          </div>

          <button
            className={`nav-item ${active === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
          >
            <Settings size={17} />
            <span>Settings</span>
          </button>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="profile"
              style={{
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'inherit',
                font: 'inherit',
              }}
              aria-expanded={profileOpen}
              onClick={() => {
                setProfileOpen((open) => !open);
                setWorkspaceOpen(false);
              }}
            >
              <div className="avatar avatar-purple">MM</div>
              <div className="profile-text">
                <b>Maitri More</b>
                <span>{user?.email || 'Signed-in account'}</span>
              </div>
              <MoreHorizontal size={17} />
            </button>

            {profileOpen && (
              <div className="action-dropdown profile-dropdown">
                <div className="dropdown-heading">
                  <b>Maitri More</b>
                  <span>{user?.email || 'Signed-in account'} · Cloud sync</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('settings')}
                >
                  <UserRound size={15} /> Profile & account
                </button>
                <button
                  type="button"
                  onClick={() => navigate('settings')}
                >
                  <Settings size={15} /> Settings
                </button>
                <button
                  type="button"
                  onClick={async () => {
                      setProfileOpen(false);
                      try {
                        await signOut(auth);
                        notify('Signed out successfully');
                      } catch (error) {
                        notify('Could not sign out. Please try again.');
                        console.error(error);
                      }
                  }}
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div className="breadcrumb">
            Workspace <span>/</span> <b>
              {active === 'overview'
                ? 'Overview'
                : active.charAt(0).toUpperCase() + active.slice(1)}
            </b>
          </div>

          <div className="top-actions">
            <div className="search-box">
              <Search size={16} />
              <input
                placeholder="Search anything..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd>⌘ K</kbd>
            </div>

            <button
              className="icon-button"
              onClick={() => notify('You’re all caught up!')}
              aria-label="Notifications"
            >
              <Bell size={18} />
              <i />
            </button>

            <button
              type="button"
              className="top-avatar"
              aria-label="Open profile"
              onClick={() => {
                setProfileOpen((open) => !open);
                setWorkspaceOpen(false);
              }}
            >
              MM
            </button>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="live-dot" /> YOUR WORKSPACE, IN FOCUS
              </div>
              <h1>
                {pageTitle}
                {active === 'overview' && <span className="wave"> ✨</span>}
              </h1>
              <p>{subtitle}</p>
            </div>

            <div className="heading-actions">
              <button
                className="button button-secondary"
                onClick={() => setModal('project')}
              >
                <Plus size={16} /> New project
              </button>
              <button
                className="button button-primary"
                onClick={() => {
                  if (!projects.length) {
                    notify('Create a project before adding tasks');
                    setModal('project');
                  } else {
                    setNewTask((current) => ({
                      ...current,
                      project: projects.some(
                        (project) => project.name === current.project
                      )
                        ? current.project
                        : projects[0].name,
                    }));
                    setModal('task');
                  }
                }}
              >
                <Plus size={16} /> New task
              </button>
            </div>
          </div>

          {active === 'overview' && (
            <Overview
              projects={projects}
              tasks={tasks}
              done={done}
              activeTasks={activeTasks}
              overdue={overdue}
              activity={activity}
              onMove={moveTask}
              onPage={navigate}
              onNewTask={() => setModal('task')}
            />
          )}

          {active === 'projects' && (
            <Projects
              projects={projects}
              tasks={tasks}
              onNew={() => setModal('project')}
              onOpen={(name) => {
                setProjectFilter(name);
                navigate('tasks');
              }}
              onDelete={deleteProject}
            />
          )}

          {active === 'tasks' && (
            <Tasks
              tasks={filteredTasks}
              projects={projects}
              projectFilter={projectFilter}
              setProjectFilter={setProjectFilter}
              onMove={moveTask}
              onNew={() => {
                if (!projects.length) {
                  notify('Create a project before adding tasks');
                  setModal('project');
                } else {
                  setModal('task');
                }
              }}
              onDelete={deleteTask}
            />
          )}

          {active === 'team' && <Team tasks={tasks} />}
          {active === 'activity' && <ActivityPage activity={activity} />}
          {active === 'analytics' && (
            <Analytics projects={projects} tasks={tasks} />
          )}

          {active === 'deadline-intelligence' && (
            <DeadlineIntelligence
              tasks={tasks}
              report={deadlineReport}
              loading={deadlineLoading}
              error={deadlineError}
              onAnalyze={analyzeDeadlines}
            />
          )}

          {active === 'settings' && (
            <SettingsPage onReset={restoreDemoData} />
          )}

          <footer className="footer">
            <span>Made for teams who make things happen.</span>
            <span>
              <span className="footer-dot" /> Demo workspace
              <span className="footer-sep"> · </span>
              Firebase Auth · Firestore · Zoho Catalyst
            </span>
          </footer>
        </div>
      </main>

      {menuOpen && (
        <button
          className="scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="eyebrow">WORKSPACE</div>
                <h2>
                  {modal === 'task'
                    ? 'Create a new task'
                    : 'Create a project'}
                </h2>
                <p>
                  {modal === 'task'
                    ? 'Make the next step clear.'
                    : 'Give your team a place to focus.'}
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setModal(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {modal === 'task' ? (
              <form onSubmit={createTask} className="modal-form">
                <label>
                  Task name
                  <input
                    autoFocus
                    required
                    placeholder="e.g. Prepare project presentation"
                    value={newTask.title}
                    onChange={(event) =>
                      setNewTask({
                        ...newTask,
                        title: event.target.value,
                      })
                    }
                  />
                </label>

                <div className="form-row">
                  <label>
                    Project
                    <select
                      required
                      value={newTask.project}
                      onChange={(event) =>
                        setNewTask({
                          ...newTask,
                          project: event.target.value,
                        })
                      }
                    >
                      {projects.map((project) => (
                        <option key={project.id} value={project.name}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Assignee
                    <select
                      value={newTask.assignee}
                      onChange={(event) =>
                        setNewTask({
                          ...newTask,
                          assignee: event.target.value,
                        })
                      }
                    >
                      {members.map((member) => (
                        <option
                          key={member.initials}
                          value={member.name.split(' ')[0]}
                        >
                          {member.name.split(' ')[0]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="form-row">
                  <label>
                    Priority
                    <select
                      value={newTask.priority}
                      onChange={(event) =>
                        setNewTask({
                          ...newTask,
                          priority: event.target.value,
                        })
                      }
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </label>

                  <label>
                    Due date
                    <input
                      type="date"
                      value={newTask.due}
                      onChange={(event) =>
                        setNewTask({
                          ...newTask,
                          due: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                <label>
                  Status
                  <select
                    value={newTask.status}
                    onChange={(event) =>
                      setNewTask({
                        ...newTask,
                        status: event.target.value,
                      })
                    }
                  >
                    <option value="todo">To do</option>
                    <option value="progress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </label>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button-primary"
                  >
                    <Plus size={15} /> Create task
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={createProject} className="modal-form">
                <label>
                  Project name
                  <input
                    autoFocus
                    required
                    placeholder="e.g. Campus Innovation Lab"
                    value={newProject.name}
                    onChange={(event) =>
                      setNewProject({
                        ...newProject,
                        name: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Project type
                  <select
                    value={newProject.tag}
                    onChange={(event) =>
                      setNewProject({
                        ...newProject,
                        tag: event.target.value,
                      })
                    }
                  >
                    <option>Course project</option>
                    <option>Research</option>
                    <option>Engineering</option>
                    <option>AI / ML</option>
                    <option>Hackathon</option>
                    <option>Student club</option>
                  </select>
                </label>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button-primary"
                  >
                    <Plus size={15} /> Create project
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">
          <span className="toast-check">
            <Check size={14} />
          </span>
          {toast}
        </div>
      )}

      <style>{`
        .action-dropdown {
          position: absolute;
          z-index: 100;
          min-width: 190px;
          padding: 6px;
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 12px;
          background: var(--surface, #fff);
          color: var(--text, #20202a);
          box-shadow: 0 12px 32px rgba(20, 20, 40, .14);
        }
        .action-dropdown button {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          padding: 10px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: inherit;
          text-align: left;
          font: inherit;
          font-size: 13px;
          cursor: pointer;
        }
        .action-dropdown button:hover {
          background: rgba(128, 128, 150, .10);
        }
        .workspace-dropdown {
          top: calc(100% + 5px);
          left: 0;
          right: 0;
        }
        .profile-dropdown {
          bottom: calc(100% + 6px);
          left: 0;
          right: 0;
        }
        .dropdown-heading {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 10px;
          border-bottom: 1px solid var(--border, #e5e7eb);
          margin-bottom: 5px;
        }
        .dropdown-heading b { font-size: 13px; }
        .dropdown-heading span {
          font-size: 11px;
          opacity: .7;
        }
        .kanban-card-top {
          position: relative;
        }
        .card-more {
          cursor: pointer;
        }
        .project-card {
          position: relative;
        }
        .project-actions {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 10;
        }
        .project-actions .action-dropdown {
          top: calc(100% + 5px);
          right: 0;
        }
        .project-actions-trigger {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }
        .project-actions-trigger:hover {
          background: rgba(128,128,150,.12);
        }
        .project-delete-action {
          color: #dc2626 !important;
        }
        .top-avatar {
          cursor: pointer;
          border: 0;
          font: inherit;
        }
      `}</style>
    </div>
  );
}

function DeadlineIntelligence({ tasks, report, loading, error, onAnalyze }) {
  const today = toLocalISODate();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = toLocalISODate(tomorrowDate);

  const openTasks = tasks.filter((task) => task.status !== 'done');
  const overdueTasks = openTasks.filter((task) => task.due && task.due < today);
  const dueTodayTasks = openTasks.filter((task) => task.due === today);
  const dueTomorrowTasks = openTasks.filter((task) => task.due === tomorrow);

  const returnedTasks = report
    ? (
        Array.isArray(report.tasks) ? report.tasks
          : Array.isArray(report.results) ? report.results
            : Array.isArray(report.analyses) ? report.analyses
              : Array.isArray(report.taskAnalysis) ? report.taskAnalysis
                : Array.isArray(report.items) ? report.items
                  : []
      )
    : [];

  const findRisk = (task) => returnedTasks.find((item) =>
    String(item.id ?? item.taskId ?? item.task_id ?? '') === String(task.id) ||
    String(item.title ?? item.taskTitle ?? item.task_title ?? '').trim().toLowerCase() ===
      String(task.title ?? '').trim().toLowerCase()
  );

  const riskLabel = (analysis) => {
    const raw = analysis?.riskLevel ?? analysis?.risk_level ?? analysis?.risk ??
      analysis?.label ?? analysis?.severity ?? analysis?.status;
    if (typeof raw === 'string' && raw.trim()) return raw;
    return 'Not provided';
  };

  const recommendationText = (analysis) => {
    const value = analysis?.recommendation ?? analysis?.recommendations ??
      analysis?.suggestion ?? analysis?.action ?? analysis?.nextStep ??
      analysis?.next_step;
    if (Array.isArray(value)) return value.filter(Boolean).join(' ');
    if (typeof value === 'string' && value.trim()) return value;
    return 'No recommendation was returned for this task.';
  };

  const scoreCandidates = [
    report?.overallRiskScore,
    report?.overall_risk_score,
    report?.riskScore,
    report?.risk_score,
    report?.summary?.overallRiskScore,
    report?.summary?.overall_risk_score,
    report?.summary?.riskScore,
    report?.summary?.risk_score,
  ];
  const rawScore = scoreCandidates.find((value) => value !== undefined && value !== null && value !== '');
  const parsedScore = Number(rawScore);
  const riskScore = rawScore !== undefined && Number.isFinite(parsedScore)
    ? Math.max(0, Math.min(100, Math.round(parsedScore)))
    : null;

  const reportSummary = typeof report?.summary === 'string'
    ? report.summary
    : report?.summary?.message ?? report?.message ?? report?.overview ?? '';

  const getRiskClass = (value) => {
    const risk = String(value || '').toLowerCase();
    if (risk.includes('critical') || risk.includes('high')) return 'risk-high';
    if (risk.includes('medium') || risk.includes('moderate')) return 'risk-medium';
    if (risk.includes('low') || risk.includes('safe')) return 'risk-low';
    return 'risk-unknown';
  };

  return (
    <div className="deadline-page">
      <section className="panel deadline-hero">
        <div className="deadline-hero-copy">
          <span className="deadline-kicker"><Zap size={14} /> RULE-BASED DEADLINE ANALYSIS</span>
          <h2>Know what could slip before it does.</h2>
          <p>
            Send your current workspace tasks to Zoho Catalyst to receive risk labels
            and recommendations. This is rule-based analysis, not a machine-learning model.
          </p>
          <button className="button button-primary" onClick={onAnalyze} disabled={loading}>
            <Zap size={16} />
            {loading ? 'Analyzing workspace…' : report ? 'Run analysis again' : 'Analyze deadlines'}
          </button>
        </div>
        <div className="deadline-hero-art" aria-hidden="true">
          <div className="deadline-art-ring ring-a" />
          <div className="deadline-art-ring ring-b" />
          <div className="deadline-art-core"><Clock3 size={30} /></div>
        </div>
      </section>

      {error && (
        <div className="deadline-error" role="alert">
          <div><b>Could not complete deadline analysis</b><p>{error}</p></div>
          <button className="button button-secondary" onClick={onAnalyze} disabled={loading}>Retry</button>
        </div>
      )}

      <div className="stats-grid deadline-stats">
        <StatCard label="Overdue" value={overdueTasks.length} note="Open tasks past their due date" icon={Clock3} tone="orange" />
        <StatCard label="Due today" value={dueTodayTasks.length} note="Open tasks due today" icon={CalendarDays} tone="blue" />
        <StatCard label="Due tomorrow" value={dueTomorrowTasks.length} note="Prepare these next" icon={Bell} tone="purple" />
        <StatCard
          label="Overall risk score"
          value={riskScore === null ? '—' : `${riskScore}/100`}
          note={riskScore === null ? 'Run Catalyst analysis to retrieve the score' : 'Returned by the analysis service'}
          icon={Gauge}
          tone={riskScore !== null && riskScore >= 70 ? 'orange' : 'green'}
        />
      </div>

      <section className="panel deadline-results">
        <div className="panel-heading">
          <div>
            <h2>Task-level analysis</h2>
            <p>{report ? 'Risk labels and recommendations returned by Zoho Catalyst.' : 'Run an analysis to load risk labels and recommendations for your workspace.'}</p>
          </div>
          {report && <span className="deadline-service-status"><span /> Catalyst response received</span>}
        </div>

        {reportSummary && <div className="deadline-summary"><Sparkles size={16} /><p>{reportSummary}</p></div>}

        {!report && !loading && !error && (
          <div className="deadline-empty">
            <div className="deadline-empty-icon"><Zap size={22} /></div>
            <h3>Your deadline report is ready to run</h3>
            <p>Analysis uses the tasks currently loaded from your workspace. No new database or AI model is required.</p>
            <button className="button button-primary" onClick={onAnalyze}>Analyze {tasks.length} tasks</button>
          </div>
        )}

        {loading && (
          <div className="deadline-loading">
            <span className="deadline-spinner" />
            <div><b>Analyzing your deadlines</b><p>Sending {tasks.length} tasks to Zoho Catalyst…</p></div>
          </div>
        )}

        {report && (
          <>
            {returnedTasks.length === 0 ? (
              <div className="deadline-empty compact-empty">
                <h3>Catalyst responded, but no task-level results were recognized.</h3>
                <p>The endpoint may use different response field names. Inspect the function's JSON response and map its task array to the table.</p>
                <details className="deadline-raw-response">
                  <summary>View response fields</summary>
                  <pre>{JSON.stringify(report, null, 2)}</pre>
                </details>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="task-table deadline-table">
                  <thead>
                    <tr><th>Task</th><th>Due date</th><th>Priority</th><th>Risk</th><th>Recommendation</th></tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const analysis = findRisk(task);
                      const label = riskLabel(analysis);
                      return (
                        <tr key={task.id}>
                          <td><div className="task-cell"><div><b>{task.title}</b><small>{task.project}</small></div></div></td>
                          <td><span className="date-text"><CalendarDays size={13} />{formatDate(task.due)}</span></td>
                          <td><Priority value={task.priority || 'Medium'} /></td>
                          <td><span className={`deadline-risk ${getRiskClass(label)}`}>{label}</span></td>
                          <td className="recommendation-cell">{recommendationText(analysis)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <div className="deadline-footnote">
        <Building2 size={16} />
        <span><b>Cloud flow:</b> Firebase Auth identifies the signed-in user, Firestore stores workspace data, and the React frontend sends the current task list to Zoho Catalyst for analysis.</span>
      </div>

      <style>{`
        .deadline-page { display: flex; flex-direction: column; gap: 22px; }
        .deadline-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; overflow: hidden; position: relative; min-height: 230px; padding: 30px; background: linear-gradient(120deg, var(--surface, #fff), rgba(200,194,255,.22)); }
        .deadline-hero-copy { max-width: 650px; position: relative; z-index: 1; }
        .deadline-kicker { display: inline-flex; align-items: center; gap: 7px; color: #7062cf; font-size: 11px; font-weight: 800; letter-spacing: .09em; }
        .deadline-hero h2 { margin: 12px 0 8px; font-size: clamp(24px, 3vw, 34px); line-height: 1.15; letter-spacing: -.035em; }
        .deadline-hero p { max-width: 600px; margin: 0 0 20px; color: var(--muted, #777783); line-height: 1.65; font-size: 13px; }
        .deadline-hero .button:disabled, .deadline-error .button:disabled { opacity: .65; cursor: wait; }
        .deadline-hero-art { width: 180px; height: 180px; flex: 0 0 180px; position: relative; display: grid; place-items: center; color: #7769d7; }
        .deadline-art-ring { position: absolute; border: 1px solid rgba(119,105,215,.24); border-radius: 50%; }
        .ring-a { width: 165px; height: 165px; }
        .ring-b { width: 125px; height: 125px; border-style: dashed; }
        .deadline-art-core { width: 76px; height: 76px; display: grid; place-items: center; border-radius: 25px; background: rgba(200,194,255,.55); box-shadow: 0 12px 35px rgba(119,105,215,.15); }
        .deadline-stats { margin: 0; }
        .deadline-results { padding: 22px; }
        .deadline-service-status { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; padding: 7px 10px; border-radius: 999px; background: rgba(34,197,94,.10); color: #16803d; font-size: 11px; font-weight: 700; }
        .deadline-service-status span { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }
        .deadline-error { display: flex; justify-content: space-between; align-items: center; gap: 16px; border: 1px solid rgba(220,38,38,.22); background: rgba(254,226,226,.45); border-radius: 14px; padding: 16px 18px; color: #991b1b; }
        .deadline-error p { margin: 4px 0 0; font-size: 12px; line-height: 1.5; }
        .deadline-summary { display: flex; gap: 10px; align-items: flex-start; margin: 0 0 16px; padding: 13px 15px; border-radius: 10px; background: rgba(200,194,255,.18); color: var(--text, #252536); }
        .deadline-summary svg { flex: 0 0 auto; color: #7769d7; margin-top: 2px; }
        .deadline-summary p { margin: 0; font-size: 13px; line-height: 1.6; }
        .deadline-empty { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 34px 18px; }
        .deadline-empty h3 { margin: 12px 0 6px; font-size: 16px; }
        .deadline-empty p { max-width: 480px; margin: 0 0 18px; color: var(--muted, #777783); font-size: 12px; line-height: 1.65; }
        .deadline-empty-icon { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 17px; color: #7769d7; background: rgba(200,194,255,.35); }
        .compact-empty { padding: 20px; }
        .deadline-loading { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 38px 15px; }
        .deadline-loading p { margin: 4px 0 0; font-size: 12px; color: var(--muted, #777783); }
        .deadline-spinner { width: 22px; height: 22px; border: 2px solid rgba(119,105,215,.2); border-top-color: #7769d7; border-radius: 50%; animation: deadline-spin .8s linear infinite; }
        @keyframes deadline-spin { to { transform: rotate(360deg); } }
        .deadline-table { min-width: 850px; }
        .deadline-table th:last-child { min-width: 250px; }
        .deadline-risk { display: inline-flex; border-radius: 999px; padding: 5px 9px; font-size: 11px; font-weight: 750; white-space: nowrap; }
        .risk-high { background: #fee2e2; color: #b91c1c; }
        .risk-medium { background: #fef3c7; color: #92400e; }
        .risk-low { background: #dcfce7; color: #166534; }
        .risk-unknown { background: rgba(128,128,150,.12); color: var(--muted, #777783); }
        .recommendation-cell { min-width: 250px; max-width: 440px; white-space: normal; font-size: 12px; line-height: 1.55; color: var(--muted, #656574); }
        .deadline-raw-response { width: 100%; text-align: left; margin-top: 10px; }
        .deadline-raw-response summary { cursor: pointer; font-size: 12px; font-weight: 700; }
        .deadline-raw-response pre { max-height: 280px; overflow: auto; padding: 12px; border-radius: 8px; background: rgba(128,128,150,.1); font-size: 11px; text-align: left; white-space: pre-wrap; overflow-wrap: anywhere; }
        .deadline-footnote { display: flex; align-items: flex-start; gap: 10px; padding: 14px 16px; border: 1px solid var(--border, #e5e7eb); border-radius: 12px; color: var(--muted, #777783); font-size: 12px; line-height: 1.6; }
        .deadline-footnote svg { flex: 0 0 auto; color: #7769d7; margin-top: 1px; }
        .deadline-footnote b { color: var(--text, #252536); }
        @media (max-width: 680px) { .deadline-hero { padding: 22px; } .deadline-hero-art { display: none; } .deadline-error { align-items: flex-start; flex-direction: column; } .deadline-service-status { display: none; } .deadline-results { padding: 16px; } }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, note, icon: Icon, tone, trend }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={18} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">
        {trend && <span className="trend"><ArrowUpRight size={13} />{trend}</span>} {note}
      </div>
    </div>
  );
}

function Overview({ projects, tasks, done, activeTasks, overdue, activity, onMove, onPage, onNewTask }) {
  const completion = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const upcoming = [...tasks]
    .filter((task) => task.status !== 'done')
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4);

  return (
    <>
      <div className="stats-grid">
        <StatCard label="Active projects" value={projects.length} note="Across your workspace" icon={FolderKanban} tone="purple" trend="In motion" />
        <StatCard label="Open tasks" value={activeTasks} note="Ready for a next step" icon={CircleDot} tone="blue" />
        <StatCard label="Tasks completed" value={done} note={`${completion}% overall completion`} icon={CircleCheckBig} tone="green" trend={`${completion}%`} />
        <StatCard label="Overdue tasks" value={overdue} note={overdue ? 'Needs your attention' : 'You’re on track'} icon={Clock3} tone="orange" />
      </div>

      <div className="overview-grid">
        <section className="panel projects-panel">
          <div className="panel-heading">
            <div><h2>Projects in motion</h2><p>A quick pulse on your team’s work</p></div>
            <button className="text-button" onClick={() => onPage('projects')}>View all <ArrowUpRight size={14} /></button>
          </div>
          <div className="project-list">
            {projects.slice(0, 3).map((project, index) => {
              const related = tasks.filter((task) => task.project === project.name);
              const completed = related.filter((task) => task.status === 'done').length;
              const progress = related.length ? Math.round(completed / related.length * 100) : 0;
              return (
                <div className="project-row" key={project.id}>
                  <div className="project-symbol" style={{ background: project.color }}>{project.initials}</div>
                  <div className="project-info">
                    <div className="project-title-row"><b>{project.name}</b><span className="project-tag">{project.tag}</span></div>
                    <div className="project-meta"><span>{related.length} tasks</span><span className="meta-sep">·</span><span>{project.members} members</span></div>
                    <div className="progress-track"><div className={`progress-fill fill-${index}`} style={{ width: `${progress}%` }} /></div>
                  </div>
                  <div className="progress-number">{progress}%</div>
                </div>
              );
            })}
          </div>
          <button className="add-project-row" onClick={() => onPage('projects')}><span><Plus size={15} /></span> Explore all projects</button>
        </section>

        <section className="panel completion-panel">
          <div className="panel-heading"><div><h2>Workspace health</h2><p>Little wins add up</p></div><div className="panel-menu"><MoreHorizontal size={19} /></div></div>
          <div className="completion-ring-wrap"><div className="completion-ring" style={{ '--progress': `${completion * 3.6}deg` }}><div className="ring-inner"><strong>{completion}%</strong><span>completed</span></div></div></div>
          <div className="health-legend">
            <div><span className="legend-dot dot-done" /><span>Completed</span><b>{done}</b></div>
            <div><span className="legend-dot dot-progress" /><span>In progress</span><b>{tasks.filter((task) => task.status === 'progress').length}</b></div>
            <div><span className="legend-dot dot-todo" /><span>To do</span><b>{tasks.filter((task) => task.status === 'todo').length}</b></div>
          </div>
          <div className="health-note"><Sparkles size={15} /><span>Keep momentum: finish one small task today.</span></div>
        </section>
      </div>

      <div className="lower-grid">
        <section className="panel tasks-panel">
          <div className="panel-heading"><div><h2>Coming up next</h2><p>Your next few action items</p></div><button className="text-button" onClick={() => onPage('tasks')}>All tasks <ArrowUpRight size={14} /></button></div>
          <div className="table-wrap">
            <table className="task-table">
              <thead><tr><th>Task</th><th>Priority</th><th>Due date</th><th>Status</th></tr></thead>
              <tbody>
                {upcoming.map((task) => (
                  <tr key={task.id}>
                    <td><div className="task-cell"><button type="button" className="task-checkbox" onClick={() => onMove(task, 'done')} aria-label="Mark complete"><Check size={12} /></button><div><b>{task.title}</b><small>{task.project}</small></div></div></td>
                    <td><Priority value={task.priority} /></td>
                    <td><span className="date-text"><CalendarDays size={13} />{formatDate(task.due)}</span></td>
                    <td><Status value={task.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel activity-panel">
          <div className="panel-heading"><div><h2>Recent activity</h2><p>Good work is worth noticing</p></div><button className="panel-menu" onClick={() => onPage('activity')}><MoreHorizontal size={19} /></button></div>
          <div className="activity-list">
            {activity.slice(0, 4).map((item, index) => (
              <div className="activity-item" key={`${item.text}-${index}`}>
                <div className={`activity-mark ${item.color}`}>{item.color === 'green' ? <Check size={13} /> : item.color === 'orange' ? <Sparkles size={13} /> : <Activity size={13} />}</div>
                <div><p>{item.text}</p><span>{item.time}</span></div>
              </div>
            ))}
          </div>
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

function Projects({ projects, tasks, onNew, onOpen, onDelete }) {
  const [openMenu, setOpenMenu] = useState(null);

  return (
    <>
      <div className="section-intro">
        <div><h2>All projects <span className="count-pill">{projects.length}</span></h2><p>Everything your team is working on, in one place.</p></div>
        <button className="button button-primary" onClick={onNew}><Plus size={15} /> Create project</button>
      </div>

      <div className="project-cards">
        {projects.map((project) => {
          const list = tasks.filter((task) => task.project === project.name);
          const complete = list.filter((task) => task.status === 'done').length;
          const progress = list.length ? Math.round(complete / list.length * 100) : 0;

          return (
            <div
              className="project-card"
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!openMenu) onOpen(project.name);
              }}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpen(project.name);
                }
              }}
            >
              <div className="project-card-top">
                <div className="project-symbol large" style={{ background: project.color }}>{project.initials}</div>
                <span className="project-tag">{project.tag}</span>

                <div className="project-actions">
                  <button
                    type="button"
                    className="project-actions-trigger"
                    aria-label={`Actions for ${project.name}`}
                    aria-expanded={openMenu === project.id}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setOpenMenu((current) => current === project.id ? null : project.id);
                    }}
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {openMenu === project.id && (
                    <div className="action-dropdown">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenu(null);
                          onOpen(project.name);
                        }}
                      >
                        <FolderKanban size={15} /> View project tasks
                      </button>
                      <button
                        type="button"
                        className="project-delete-action"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenu(null);
                          onDelete(project);
                        }}
                      >
                        <Trash2 size={15} /> Delete project
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <h3>{project.name}</h3>
              <p className="project-card-desc">{projectDesc(project.tag)}</p>
              <div className="project-card-stats"><span><Check size={14} />{list.length} tasks</span><span><Users size={14} />{project.members} members</span></div>
              <div className="card-progress-head"><span>Completion</span><b>{progress}%</b></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <div className="avatar-stack">{members.slice(0, Math.min(project.members, 4)).map((member) => <span key={member.initials} className="mini-avatar" style={{ background: member.color }}>{member.initials}</span>)}<span className="mini-add">+</span></div>
            </div>
          );
        })}

        <button className="new-project-card" onClick={onNew}><span><Plus size={22} /></span><b>Start something new</b><small>Create a shared space for your next idea.</small></button>
      </div>
    </>
  );
}

function Tasks({ tasks, projects, projectFilter, setProjectFilter, onMove, onNew, onDelete }) {
  const [openMenu, setOpenMenu] = useState(null);

  return (
    <>
      <div className="task-toolbar">
        <div className="filter-select"><Filter size={15} /><select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option>All projects</option>{projects.map((project) => <option key={project.id} value={project.name}>{project.name}</option>)}</select><ChevronDown size={14} /></div>
        <span className="task-count">{tasks.length} tasks found</span>
        <button className="button button-primary" onClick={onNew}><Plus size={15} /> New task</button>
      </div>

      <div className="kanban">
        {['todo', 'progress', 'done'].map((status) => {
          const meta = statusMeta[status];
          const list = tasks.filter((task) => task.status === status);

          return (
            <section className="kanban-column" key={status}>
              <div className="kanban-head"><div className={`status-icon ${status}`}><meta.icon size={15} /></div><b>{meta.label}</b><span className="column-count">{list.length}</span><button className="column-add" onClick={onNew}><Plus size={15} /></button></div>

              <div className="kanban-cards">
                {list.map((task) => {
                  const project = projects.find((item) => item.name === task.project);
                  const menuId = task.id;

                  return (
                    <article className="kanban-card" key={task.id}>
                      <div className="kanban-card-top">
                        <span className={`project-mini-dot ${project ? '' : 'muted'}`} style={{ background: project?.color || '#ddd' }} />
                        <span className="kanban-project">{task.project}</span>

                        <div style={{ position: 'relative', marginLeft: 'auto' }}>
                          <button
                            type="button"
                            className="card-more"
                            aria-label={`Actions for ${task.title}`}
                            aria-expanded={openMenu === menuId}
                            title="Task actions"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setOpenMenu((current) => current === menuId ? null : menuId);
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {openMenu === menuId && (
                            <div className="action-dropdown task-actions-dropdown">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenu(null);
                                  onMove(task, status === 'todo' ? 'progress' : status === 'progress' ? 'done' : 'todo');
                                }}
                              >
                                <ArrowUpRight size={15} />
                                {status === 'done' ? 'Reopen task' : 'Move to next stage'}
                              </button>
                              <button
                                type="button"
                                className="project-delete-action"
                                onClick={() => {
                                  setOpenMenu(null);
                                  onDelete(task);
                                }}
                              >
                                <Trash2 size={15} /> Delete task
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <h3>{task.title}</h3>

                      <div className="kanban-card-bottom"><Priority value={task.priority} /><span className="date-text"><CalendarDays size={12} />{formatDate(task.due)}</span></div>

                      <div className="kanban-assignee">
                        <span className="mini-avatar" style={{ background: members.find((member) => member.initials === task.initials)?.color || '#d8d4ff' }}>{task.initials}</span>
                        <span>{task.assignee}</span>
                        <button className="move-next" onClick={() => onMove(task, status === 'todo' ? 'progress' : status === 'progress' ? 'done' : 'todo')}>{status === 'done' ? 'Reopen' : status === 'todo' ? 'Start' : 'Complete'} <ArrowUpRight size={12} /></button>
                      </div>
                    </article>
                  );
                })}

                {list.length === 0 && <div className="empty-column">No tasks here yet.<button onClick={onNew}>Add one</button></div>}
              </div>
            </section>
          );
        })}
      </div>

      <p className="board-hint"><CircleHelp size={14} /> Tip: use a task card's menu to delete it or move it through the workflow. Changes sync to your account.</p>

      <style>{`
        .task-actions-dropdown {
          top: calc(100% + 5px);
          right: 0;
        }
      `}</style>
    </>
  );
}

function Team({ tasks }) {
  return (
    <>
      <div className="team-summary"><div className="team-summary-icon"><Users size={21} /></div><div><h2>A small team can do big things.</h2><p>See who’s contributing across the workspace.</p></div><span className="team-count">{members.length} members</span></div>
      <div className="team-grid">
        {members.map((member) => {
          const own = tasks.filter((task) => task.assignee === member.name.split(' ')[0]);
          const complete = own.filter((task) => task.status === 'done').length;

          return (
            <div className="team-card" key={member.initials}>
              <div className="team-card-top"><div className="avatar avatar-large" style={{ background: member.color }}>{member.initials}</div><span className="member-online"><i /> Active</span><div className="panel-menu"><MoreHorizontal size={18} /></div></div>
              <h3>{member.name}</h3><p>{member.role}</p>
              <div className="member-stats"><div><b>{own.length}</b><span>Assigned</span></div><div><b>{complete}</b><span>Completed</span></div><div><b>{own.length ? Math.round(complete / own.length * 100) : 0}%</b><span>Progress</span></div></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${own.length ? complete / own.length * 100 : 0}%` }} /></div>
            </div>
          );
        })}
        <button className="invite-card" onClick={() => {
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText('Join our SyncSpace workspace').then(() => {
              window.alert('Demo invitation text copied. Actual invitations require a backend.');
            }).catch(() => {
              window.alert('Actual invitations are not configured in this demo.');
            });
          } else {
            window.alert('Actual invitations are not configured in this demo.');
          }
        }}><span><Plus size={21} /></span><b>Invite a teammate</b><small>Bring another collaborator into the loop.</small></button>
      </div>
    </>
  );
}

function ActivityPage({ activity }) {
  return (
    <section className="panel activity-full">
      <div className="panel-heading"><div><h2>Workspace timeline</h2><p>Updates from your projects and tasks.</p></div><span className="live-label"><span className="live-dot" /> Recent</span></div>
      {activity.map((item, index) => (
        <div className="timeline-row" key={`${item.text}-${index}`}>
          <div className={`activity-mark ${item.color}`}>{item.color === 'green' ? <Check size={13} /> : item.color === 'orange' ? <Sparkles size={13} /> : <Activity size={13} />}</div>
          <div className="timeline-copy"><p>{item.text}</p><span>{item.time}</span></div>
          <span className="timeline-type">{item.color === 'green' ? 'Completed' : 'Workspace update'}</span>
        </div>
      ))}
    </section>
  );
}

function Analytics({ projects, tasks }) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === 'done').length;
  const progress = tasks.filter((task) => task.status === 'progress').length;
  const todo = tasks.filter((task) => task.status === 'todo').length;

  return (
    <>
      <div className="stats-grid">
        <StatCard label="Total tasks" value={total} note="Across all projects" icon={FolderKanban} tone="purple" />
        <StatCard label="Completion rate" value={`${total ? Math.round(done / total * 100) : 0}%`} note="Tasks marked done" icon={CircleCheckBig} tone="green" />
        <StatCard label="In progress" value={progress} note="Currently being worked on" icon={Activity} tone="blue" />
        <StatCard label="Not started" value={todo} note="Waiting for a first step" icon={Clock3} tone="orange" />
      </div>

      <div className="analytics-grid">
        <section className="panel">
          <div className="panel-heading"><div><h2>Task breakdown</h2><p>Current workflow distribution</p></div></div>
          <div className="bar-chart">
            {[{ name: 'To do', value: todo, color: 'bar-todo' }, { name: 'In progress', value: progress, color: 'bar-progress' }, { name: 'Done', value: done, color: 'bar-done' }].map((item) => (
              <div className="bar-row" key={item.name}><div className="bar-label"><span>{item.name}</span><b>{item.value}</b></div><div className="bar-track"><div className={`bar-fill ${item.color}`} style={{ width: `${total ? item.value / total * 100 : 0}%` }} /></div></div>
            ))}
          </div>
          <div className="chart-footnote"><span className="legend-dot dot-done" /> Based on {total} workspace tasks <span className="footer-sep">·</span> Updates as tasks change</div>
        </section>

        <section className="panel">
          <div className="panel-heading"><div><h2>Project progress</h2><p>Completion by project</p></div></div>
          <div className="analytics-project-list">
            {projects.map((project) => {
              const related = tasks.filter((task) => task.project === project.name);
              const completed = related.filter((task) => task.status === 'done').length;
              const percentage = related.length ? Math.round(completed / related.length * 100) : 0;

              return (
                <div className="analytics-project" key={project.id}>
                  <div className="analytics-project-icon" style={{ background: project.color }}>{project.initials}</div>
                  <div className="analytics-project-body"><div><b>{project.name}</b><span>{percentage}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${percentage}%` }} /></div></div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="notice-strip"><Sparkles size={17} /><div><b>Demo analytics</b><p>These insights are calculated from your Firestore workspace data. Signed-in access is account-specific; shared team workspaces require membership and collaboration features.</p></div></div>
    </>
  );
}

function SettingsPage({ onReset }) {
  return (
    <div className="settings-layout">
      <section className="panel settings-panel">
        <div className="panel-heading"><div><h2>Workspace settings</h2><p>Settings for your SyncSpace workspace.</p></div></div>
        <div className="setting-row"><div><b>Workspace name</b><p>The name shown in the sidebar.</p></div><span className="setting-value">UGDX Workspace</span></div>
        <div className="setting-row"><div><b>Account mode</b><p>You are signed in with Firebase Authentication.</p></div><span className="setting-pill green-pill">Authenticated</span></div>
        <div className="setting-row"><div><b>Data storage</b><p>Your workspace is saved to Firestore and cached in this browser.</p></div><span className="setting-pill green-pill">Firestore</span></div>
        <div className="setting-row"><div><b>Cloud storage</b><p>Workspace data is scoped to your signed-in account.</p></div><span className="setting-pill green-pill">Connected</span></div>
      </section>

      <section className="panel settings-panel">
        <div className="panel-heading"><div><h2>Demo data</h2><p>Restore the seeded example workspace.</p></div></div>
        <p className="settings-body-copy">Reset projects, tasks and activity to the seeded example data in your cloud workspace.</p>
        <button className="button button-secondary" onClick={onReset}>Restore demo data</button>
      </section>
    </div>
  );
}

function Priority({ value }) {
  return <span className={`priority priority-${value.toLowerCase()}`}><i />{value}</span>;
}

function Status({ value }) {
  const meta = statusMeta[value];
  return <span className={`status-pill ${value}`}><meta.icon size={12} />{meta.label}</span>;
}

function formatDate(value) {
  if (!value) return 'No date';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function projectDesc(tag) {
  return ({
    Research: 'Explore questions, gather evidence, and turn ideas into useful outcomes.',
    Engineering: 'Build, test, and improve a system together.',
    'AI / ML': 'Experiment, evaluate, and make intelligent tools useful.',
    Hackathon: 'Move from idea to prototype with your team.',
    'Student club': 'Coordinate people, plans, and shared initiatives.',
  })[tag] || 'A shared space to plan, build, and deliver your next idea.';
}

function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  if (user === undefined) {
    return <p style={{ padding: 24 }}>Loading SyncSpace...</p>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <Dashboard user={user} />;
}

export default App;


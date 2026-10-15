
import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import {
  collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where, writeBatch
} from 'firebase/firestore';
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

function readLocal(uid, key, fallback = []) {
  try {
    const raw = localStorage.getItem(localKey(uid, key));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function Dashboard({ user }) {
  const [active, setActive] = useState('overview');

  // Each signed-in account starts with its own cached data, or an empty workspace.
  const [projects, setProjects] = useState(() => readLocal(user.uid, 'projects', []));
  const [tasks, setTasks] = useState(() => readLocal(user.uid, 'tasks', []));
  const [activity, setActivity] = useState(() => readLocal(user.uid, 'activity', []));

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
  const [workspaceId, setWorkspaceId] = useState(
    () => readLocal(user.uid, 'workspaceId', user.uid)
  );
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [inviteCodeDisplay, setInviteCodeDisplay] = useState('');
  const [teamBusy, setTeamBusy] = useState(false);


  const [newTask, setNewTask] = useState({
    title: '',
    project: '',
    status: 'todo',
    priority: 'Medium',
    due: todayISO(),
    assignee: 'Maitri'
  });

  const [newProject, setNewProject] = useState({
    name: '',
    tag: 'Course project'
  });

  const [deadlineReport, setDeadlineReport] = useState(null);
  const [deadlineLoading, setDeadlineLoading] = useState(false);
  const [deadlineError, setDeadlineError] = useState('');

  const [azureHealthReport, setAzureHealthReport] = useState(null);
  const [azureHealthLoading, setAzureHealthLoading] = useState(false);
  const [azureHealthError, setAzureHealthError] = useState('');

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

  // Load the active workspace. Keep the old personal document intact.
  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      setCloudReady(false);
      setCloudStatus('Connecting');

      try {
        let activeId = workspaceId || user.uid;

        if (activeId === user.uid) {
          // Preserve existing personal data while initializing the shared workspace.
          const personalRef = doc(db, 'users', user.uid, 'workspace', 'data');
          const personalSnapshot = await getDoc(personalRef);
          const personalData = personalSnapshot.exists()
            ? personalSnapshot.data()
            : { projects: [], tasks: [], activity: [] };

          const workspaceRef = doc(db, 'workspaces', user.uid);
          await setDoc(workspaceRef, {
            ownerId: user.uid,
            name: user.displayName
              ? `${user.displayName}'s workspace`
              : 'My workspace',
            updatedAt: new Date().toISOString()
          }, { merge: true });

          await setDoc(
            doc(db, 'workspaces', user.uid, 'members', user.uid),
            {
              uid: user.uid,
              email: (user.email || '').toLowerCase(),
              displayName: user.displayName || user.email || 'Workspace owner',
              role: 'owner',
              joinedAt: new Date().toISOString()
            },
            { merge: true }
          );
        }

        const memberRef = doc(db, 'workspaces', activeId, 'members', user.uid);
        const memberSnapshot = await getDoc(memberRef);

        if (!memberSnapshot.exists()) {
          if (activeId !== user.uid) {
            activeId = user.uid;
            localStorage.setItem(
              localKey(user.uid, 'workspaceId'),
              JSON.stringify(activeId)
            );
            if (!cancelled) setWorkspaceId(activeId);
            return;
          }
          throw new Error('Your workspace membership could not be initialized.');
        }

        const sharedRef = doc(db, 'workspaces', activeId, 'data', 'main');
        const sharedSnapshot = await getDoc(sharedRef);

        if (!sharedSnapshot.exists() && activeId === user.uid) {
          const personalRef = doc(db, 'users', user.uid, 'workspace', 'data');
          const personalSnapshot = await getDoc(personalRef);
          const data = personalSnapshot.exists()
            ? personalSnapshot.data()
            : { projects: [], tasks: [], activity: [] };

          await setDoc(sharedRef, {
            projects: Array.isArray(data.projects) ? data.projects : [],
            tasks: Array.isArray(data.tasks) ? data.tasks : [],
            activity: Array.isArray(data.activity) ? data.activity : [],
            updatedAt: new Date().toISOString()
          });
        }

        const finalSnapshot = sharedSnapshot.exists()
          ? sharedSnapshot
          : await getDoc(sharedRef);

        if (cancelled) return;

        const data = finalSnapshot.exists() ? finalSnapshot.data() : {};
        const nextProjects = Array.isArray(data.projects) ? data.projects : [];
        const nextTasks = Array.isArray(data.tasks) ? data.tasks : [];
        const nextActivity = Array.isArray(data.activity) ? data.activity : [];

        setProjects(nextProjects);
        setTasks(nextTasks);
        setActivity(nextActivity);

        localStorage.setItem(localKey(user.uid, 'projects'), JSON.stringify(nextProjects));
        localStorage.setItem(localKey(user.uid, 'tasks'), JSON.stringify(nextTasks));
        localStorage.setItem(localKey(user.uid, 'activity'), JSON.stringify(nextActivity));
        localStorage.setItem(localKey(user.uid, 'workspaceId'), JSON.stringify(activeId));

        const membersSnapshot = await getDocs(
          collection(db, 'workspaces', activeId, 'members')
        );

        if (!cancelled) {
          setWorkspaceId(activeId);
          setWorkspaceMembers(
            membersSnapshot.docs.map(item => ({ id: item.id, ...item.data() }))
          );
          setCloudStatus('Synced');
        }
      } catch (error) {
        console.error('Workspace load failed:', error);
        if (!cancelled) {
          setCloudStatus('Offline');
          notify(
            'Workspace sync failed. Check Firestore rules and membership.',
            true
          );
        }
      } finally {
        if (!cancelled) setCloudReady(true);
      }
    }

    loadWorkspace();
    return () => { cancelled = true; };
  }, [user.uid, workspaceId]);


  const createTeamInvitation = async (emailInput) => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      notify('Enter a valid email address.', true);
      return;
    }

    const currentMember = workspaceMembers.find(item => item.id === user.uid);
    if (!currentMember || currentMember.role !== 'owner') {
      notify('Only the workspace owner can invite members.', true);
      return;
    }

    if (email === (user.email || '').toLowerCase()) {
      notify('You are already a member of this workspace.', true);
      return;
    }

    setTeamBusy(true);
    try {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const bytes = crypto.getRandomValues(new Uint8Array(10));
      const code = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');

      await setDoc(doc(db, 'inviteCodes', code), {
        workspaceId,
        email,
        createdBy: user.uid,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      setInviteCodeDisplay(code);
      notify('Invitation code created. Share it with the invited email address.');
    } catch (error) {
      console.error('Invitation creation failed:', error);
      notify('Could not create the invitation. Check Firestore rules.', true);
    } finally {
      setTeamBusy(false);
    }
  };

  const acceptTeamInvitation = async (codeInput) => {
    const code = codeInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(code)) {
      notify('Enter a valid 10-character invitation code.', true);
      return;
    }

    if (!user.email) {
      notify('Your signed-in account needs an email address.', true);
      return;
    }

    setTeamBusy(true);
    try {
      const inviteRef = doc(db, 'inviteCodes', code);
      const inviteSnapshot = await getDoc(inviteRef);

      if (!inviteSnapshot.exists()) {
        throw new Error('Invitation not found.');
      }

      const invitation = inviteSnapshot.data();
      if (invitation.status !== 'pending') {
        throw new Error('This invitation has already been used.');
      }
      if (invitation.email !== user.email.toLowerCase()) {
        throw new Error('Sign in with the email address this invitation was sent to.');
      }
      if (!invitation.workspaceId || invitation.workspaceId === user.uid) {
        throw new Error('This invitation has an invalid workspace.');
      }

      const batch = writeBatch(db);
      batch.set(
        doc(db, 'workspaces', invitation.workspaceId, 'members', user.uid),
        {
          uid: user.uid,
          email: user.email.toLowerCase(),
          displayName: user.displayName || user.email,
          role: 'member',
          inviteCode: code,
          joinedAt: new Date().toISOString()
        }
      );
      batch.update(inviteRef, {
        status: 'accepted',
        acceptedBy: user.uid,
        acceptedAt: new Date().toISOString()
      });
      await batch.commit();

      localStorage.setItem(
        localKey(user.uid, 'workspaceId'),
        JSON.stringify(invitation.workspaceId)
      );
      setWorkspaceId(invitation.workspaceId);
      setActive('team');
      setInviteCodeDisplay('');
      notify('Invitation accepted. Loading the shared workspace.');
    } catch (error) {
      console.error('Invitation acceptance failed:', error);
      notify(error.message || 'Could not accept invitation. Check Firestore rules.', true);
    } finally {
      setTeamBusy(false);
    }
  };


  const leaveTeamWorkspace = async () => {
    if (workspaceId === user.uid) {
      notify('You are already in your personal workspace.', true);
      return;
    }

    const me = workspaceMembers.find(member => member.id === user.uid);
    if (me?.role === 'owner') {
      notify('Owners must delete the shared workspace or transfer ownership before leaving.', true);
      return;
    }

    if (!window.confirm('Leave this shared workspace? Your personal workspace will remain intact.')) return;

    setTeamBusy(true);
    try {
      await deleteDoc(doc(db, 'workspaces', workspaceId, 'members', user.uid));
      localStorage.setItem(localKey(user.uid, 'workspaceId'), JSON.stringify(user.uid));
      setWorkspaceMembers([]);
      setWorkspaceId(user.uid);
      setActive('overview');
      notify('You left the shared workspace.');
    } catch (error) {
      console.error('Leave workspace failed:', error);
      notify('Could not leave the workspace. Check Firestore rules.', true);
    } finally {
      setTeamBusy(false);
    }
  };

  const deleteTeamWorkspace = async () => {
    if (workspaceId === user.uid) {
      notify('Your personal workspace cannot be deleted here.', true);
      return;
    }

    const me = workspaceMembers.find(member => member.id === user.uid);
    if (me?.role !== 'owner') {
      notify('Only the workspace owner can delete it.', true);
      return;
    }

    if (!window.confirm('PERMANENTLY DELETE this shared workspace, its shared tasks, members, and invitation codes? Personal workspace backups and Firebase accounts will not be deleted. This cannot be undone.')) return;

    setTeamBusy(true);
    try {
      // Remove invitations while owner permissions are still available.
      const invites = await getDocs(query(
        collection(db, 'inviteCodes'),
        where('workspaceId', '==', workspaceId)
      ));

      for (let i = 0; i < invites.docs.length; i += 400) {
        const batch = writeBatch(db);
        invites.docs.slice(i, i + 400).forEach(item => batch.delete(item.ref));
        await batch.commit();
      }

      // Delete shared data before removing memberships.
      await deleteDoc(doc(db, 'workspaces', workspaceId, 'data', 'main'));

      const memberDocs = await getDocs(
        collection(db, 'workspaces', workspaceId, 'members')
      );
      const others = memberDocs.docs.filter(item => item.id !== user.uid);

      for (let i = 0; i < others.length; i += 400) {
        const batch = writeBatch(db);
        others.slice(i, i + 400).forEach(item => batch.delete(item.ref));
        await batch.commit();
      }

      // Remove the owner last, then remove workspace metadata.
      await deleteDoc(doc(db, 'workspaces', workspaceId, 'members', user.uid));
      await deleteDoc(doc(db, 'workspaces', workspaceId));

      localStorage.setItem(localKey(user.uid, 'workspaceId'), JSON.stringify(user.uid));
      setWorkspaceMembers([]);
      setWorkspaceId(user.uid);
      setActive('overview');
      notify('Shared workspace deleted.');
    } catch (error) {
      console.error('Delete workspace failed:', error);
      notify('Workspace deletion did not finish. Check Firestore rules and console errors before retrying.', true);
    } finally {
      setTeamBusy(false);
    }
  };

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
      await setDoc(
        doc(db, 'workspaces', workspaceId, 'data', 'main'),
        {
          projects: p,
          tasks: t,
          activity: a,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

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

  const done = tasks.filter(task => task.status === 'done').length;
  const activeTasks = tasks.filter(task => task.status !== 'done').length;

  const overdue = tasks.filter(
    task => task.status !== 'done' && task.due && task.due < todayISO()
  ).length;

  const filteredTasks = useMemo(
    () => tasks.filter(task =>
      (projectFilter === 'All projects' || task.project === projectFilter) &&
      `${task.title} ${task.project} ${task.assignee} ${task.priority}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    ),
    [tasks, projectFilter, query]
  );

  const navigate = (page) => {
    setActive(page);
    setMenuOpen(false);
    setProfileOpen(false);
    setWorkspaceOpen(false);
  };

  const moveTask = (task, status) => {
    if (!statusMeta[status]) return;

    const nextTasks = tasks.map(item =>
      item.id === task.id ? { ...item, status } : item
    );

    const nextActivity = recordActivity(
      `Moved “${task.title}” to ${statusMeta[status].label}`,
      status === 'done' ? 'green' : 'purple'
    );

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

    const nextProjects = projects.filter(item => item.id !== project.id);
    const nextTasks = tasks.filter(task => task.project !== project.name);
    const nextActivity = recordActivity(
      `Deleted project “${project.name}” and its tasks`,
      'orange'
    );

    setProjects(nextProjects);
    setTasks(nextTasks);
    setActivity(nextActivity);
    setProjectFilter('All projects');
    setNewTask(current => ({
      ...current,
      project: nextProjects[0]?.name || ''
    }));

    if (active === 'tasks' && nextProjects.length === 0) {
      setActive('projects');
    }

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

    const projectName = projects.some(project => project.name === newTask.project)
      ? newTask.project
      : projects[0].name;

    const person = members.find(
      member => member.name.split(' ')[0] === newTask.assignee
    ) || members[0];

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
      title: '',
      project: projectName,
      status: 'todo',
      priority: 'Medium',
      due: todayISO(),
      assignee: 'Maitri'
    });

    persist(projects, nextTasks, nextActivity);
    notify('Task created');
  };

  const createProject = (event) => {
    event.preventDefault();

    const name = newProject.name.trim();
    if (!name) return;

    if (projects.some(project => project.name.toLowerCase() === name.toLowerCase())) {
      notify('A project with this name already exists', true);
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
        .map(word => word[0])
        .join('')
        .toUpperCase(),
      members: 1
    };

    const nextProjects = [...projects, project];
    const nextActivity = recordActivity(`Created project “${name}”`, 'green');

    setProjects(nextProjects);
    setActivity(nextActivity);
    setNewTask(current => ({
      ...current,
      project: current.project || name
    }));
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

  // Cloudflare Worker: deadline analysis.
  const analyzeDeadlines = async () => {
    setDeadlineLoading(true);
    setDeadlineError('');
    setDeadlineReport(null);

    try {
      if (tasks.length === 0) {
        throw new Error('No tasks found. Create tasks before running deadline analysis.');
      }

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
              priority: task.priority || 'Medium',
              dueDate: task.due || null,
              status:
                task.status === 'done'
                  ? 'Done'
                  : task.status === 'progress'
                    ? 'In Progress'
                    : 'To Do'
            }))
          })
        }
      );

      const raw = await response.text();
      let result;

      try {
        result = JSON.parse(raw);
      } catch {
        console.error('Cloudflare returned non-JSON:', raw);
        throw new Error(
          `The analysis service returned invalid JSON (HTTP ${response.status}).`
        );
      }

      console.log('Deadline analysis response:', result);

      if (!response.ok) {
        throw new Error(
          result.error ||
          result.message ||
          `Analysis service returned HTTP ${response.status}.`
        );
      }

      // Unwrap common API response formats without assuming a specific model output.
      let report = result;

      for (let attempt = 0; attempt < 4; attempt++) {
        if (typeof report === 'string') {
          try {
            report = JSON.parse(report);
            continue;
          } catch {
            throw new Error('The analysis service returned text instead of a structured report.');
          }
        }

        if (!report || typeof report !== 'object' || Array.isArray(report)) {
          throw new Error('The analysis service returned an unexpected response format.');
        }

        if (report.success === false) {
          throw new Error(report.error || report.message || 'Deadline analysis failed.');
        }

        if (report.output !== undefined) {
          report = report.output;
          continue;
        }

        if (report.data !== undefined) {
          report = report.data;
          continue;
        }

        break;
      }

      if (!report || typeof report !== 'object' || Array.isArray(report)) {
        throw new Error('The analysis service did not return a usable report.');
      }

      if (report.success === false) {
        throw new Error(report.error || report.message || 'Deadline analysis failed.');
      }

      setDeadlineReport(report);
      notify('Deadline analysis completed');
    } catch (error) {
      console.error('Deadline analysis failed:', error);
      setDeadlineError(
        error.message ||
        'Could not reach the deadline analysis service. Check the Worker deployment and CORS settings.'
      );
    } finally {
      setDeadlineLoading(false);
    }
  };

  // Azure Function: project health analysis.
  const analyzeProjectHealth = async () => {
    setAzureHealthLoading(true);
    setAzureHealthError('');
    setAzureHealthReport(null);

    try {
      if (tasks.length === 0) {
        throw new Error('No tasks found. Create tasks before running project health analysis.');
      }

      const response = await fetch('/api/project-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.map(task => ({
            id: task.id,
            title: task.title,
            project: task.project,
            priority: task.priority || 'Medium',
            dueDate: task.due || null,
            status:
              task.status === 'done'
                ? 'Done'
                : task.status === 'progress'
                  ? 'In Progress'
                  : 'To Do'
          }))
        })
      });

      const raw = await response.text();
      let result;

      try {
        result = JSON.parse(raw);
      } catch {
        console.error('Azure returned non-JSON:', raw);
        throw new Error(
          `Azure returned an invalid response (HTTP ${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
          result.message ||
          `Azure API error: ${response.status}`
        );
      }

      setAzureHealthReport(result);
      notify('Azure project health analysis completed');
    } catch (error) {
      console.error('Azure project health failed:', error);
      setAzureHealthError(error.message || 'Azure project health analysis failed.');
    } finally {
      setAzureHealthLoading(false);
    }
  };

  const pageTitles = {
    overview: [
      'Your workspace, in focus',
      `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}`,
      'Here’s what’s happening across your workspace.'
    ],
    projects: [
      'PLAN & BUILD',
      'Your projects',
      'Keep every project moving in the right direction.'
    ],
    tasks: [
      'YOUR WORKFLOW',
      'My tasks',
      'A clear view of what needs your attention.'
    ],
    team: [
      'PEOPLE & COLLABORATION',
      'Your team',
      'The people building great things together.'
    ],
    activity: [
      'WORKSPACE HISTORY',
      'Activity',
      'A trail of your team’s progress.'
    ],
    analytics: [
      'INSIGHTS & PROGRESS',
      'Analytics',
      'Understand progress at a glance.'
    ],
    'deadline-intelligence': [
      'SMARTER PLANNING',
      'Deadline Intelligence',
      'Spot deadline risks before they become problems.'
    ],
    settings: [
      'PREFERENCES',
      'Settings',
      'Manage your workspace and account.'
    ]
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
          <button
            className="mobile-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="workspace-wrap">
          <button
            className="workspace-switch"
            onClick={() => {
              setWorkspaceOpen(!workspaceOpen);
              setProfileOpen(false);
            }}
          >
            <div className="workspace-avatar">S</div>
            <div className="workspace-name">
              <b>SyncSpace Workspace</b>
              <span>Personal workspace</span>
            </div>
            <ChevronDown size={15} />
          </button>

          {workspaceOpen && (
            <div className="action-dropdown workspace-dropdown">
              <button onClick={() => navigate('overview')}>
                <LayoutDashboard size={15} /> Overview
              </button>
              <button onClick={() => navigate('projects')}>
                <FolderKanban size={15} /> Projects
              </button>
              <button onClick={() => navigate('settings')}>
                <Settings size={15} /> Settings
              </button>
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
                  <button
                    key={item.id}
                    className={`nav-item ${active === item.id ? 'active' : ''}`}
                    onClick={() => navigate(item.id)}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                    {item.id === 'tasks' && activeTasks > 0 && (
                      <span className="nav-count">{activeTasks}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          <div className="nav-group">
            <div className="nav-label nav-label-row">
              YOUR PROJECTS
              <button
                className="tiny-add"
                onClick={() => setModal('project')}
                aria-label="Add project"
              >
                <Plus size={14} />
              </button>
            </div>

            {projects.slice(0, 6).map(project => (
              <button
                key={project.id}
                className="project-nav"
                onClick={() => {
                  setProjectFilter(project.name);
                  navigate('tasks');
                }}
              >
                <span className="project-dot" style={{ background: project.color }} />
                <span>{project.name}</span>
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
            <button onClick={() => navigate('analytics')}>
              Explore your progress <ArrowUpRight size={14} />
            </button>
          </div>

          <button
            className={`nav-item ${active === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
          >
            <Settings size={17} />
            <span>Settings</span>
          </button>

          <div className="profile-wrap">
            <button
              className="profile"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setWorkspaceOpen(false);
              }}
            >
              <div className="avatar avatar-purple">
                {(user.displayName || 'U')
                  .split(' ')
                  .map(value => value[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>

              <div className="profile-text">
                <b>{user.displayName || 'Your account'}</b>
                <span>{user.email}</span>
              </div>
              <MoreHorizontal size={18} />
            </button>

            {profileOpen && (
              <div className="action-dropdown profile-dropdown">
                <div className="dropdown-heading">
                  <b>{user.displayName || 'Your account'}</b>
                  <span>{user.email}</span>
                </div>

                <button onClick={() => navigate('settings')}>
                  <UserRound size={15} /> Account settings
                </button>

                <button
                  onClick={async () => {
                    try {
                      await signOut(auth);
                    } catch (error) {
                      console.error(error);
                      notify('Could not sign out. Please retry.', true);
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

      {menuOpen && (
        <button
          className="scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}

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
            Workspace <span>/</span> <b>{title}</b>
          </div>

          <div className="top-actions">
            <div className="search-box">
              <Search size={16} />
              <input
                placeholder="Search tasks..."
                value={query}
                onChange={event => {
                  setQuery(event.target.value);
                  if (event.target.value.trim()) setActive('tasks');
                }}
              />
              {query ? (
                <button
                  className="search-clear"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd>⌘ K</kbd>
              )}
            </div>

            <button
              className="icon-button"
              onClick={() => navigate('activity')}
              aria-label="View activity"
            >
              <Bell size={18} />
            </button>

            <button
              className="top-avatar"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setWorkspaceOpen(false);
              }}
              aria-label="Open profile"
            >
              {(user.displayName || 'U')
                .split(' ')
                .map(value => value[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </button>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="live-dot" /> {eyebrow}
              </div>
              <h1>
                {title}
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
                    notify('Create a project before adding tasks', true);
                    setModal('project');
                  } else {
                    setNewTask(current => ({
                      ...current,
                      project: projects.some(project => project.name === current.project)
                        ? current.project
                        : projects[0].name
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
              onOpen={name => {
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
                  setModal('project');
                  notify('Create a project first', true);
                } else {
                  setModal('task');
                }
              }}
              onDelete={deleteTask}
            />
          )}

          {active === 'team' && (
            <Team
              tasks={tasks}
              user={user}
              workspaceId={workspaceId}
              workspaceMembers={workspaceMembers}
              inviteCodeDisplay={inviteCodeDisplay}
              busy={teamBusy}
              onCreateInvite={createTeamInvitation}
              onAcceptInvite={acceptTeamInvitation}
              onLeaveWorkspace={leaveTeamWorkspace}
              onDeleteWorkspace={deleteTeamWorkspace}
            />
          )}
          {active === 'activity' && <ActivityPage activity={activity} />}
          {active === 'analytics' && <Analytics projects={projects} tasks={tasks} />}

          {active === 'deadline-intelligence' && (
            <DeadlineIntelligence
              tasks={tasks}
              report={deadlineReport}
              loading={deadlineLoading}
              error={deadlineError}
              onAnalyze={analyzeDeadlines}
              azureReport={azureHealthReport}
              azureLoading={azureHealthLoading}
              azureError={azureHealthError}
              onAzureAnalyze={analyzeProjectHealth}
            />
          )}

          {active === 'settings' && (
            <SettingsPage
              user={user}
              cloudStatus={cloudStatus}
              onReset={restoreDemoData}
            />
          )}

          <footer className="footer">
            <span>Made for teams who make things happen.</span>
            <span className="footer-status">
              <i className={cloudStatus === 'Synced' ? 'online' : 'offline'} />
              {saving ? 'Saving changes…' : cloudStatus}
              <span className="footer-sep">·</span>
              Firebase · Cloudflare Workers · Azure
            </span>
          </footer>
        </div>
      </main>

      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="eyebrow">WORKSPACE</div>
                <h2>{modal === 'task' ? 'Create a new task' : 'Create a project'}</h2>
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
              <form className="modal-form" onSubmit={createTask}>
                <label>
                  Task name
                  <input
                    autoFocus
                    required
                    maxLength={160}
                    placeholder="e.g. Prepare project presentation"
                    value={newTask.title}
                    onChange={event =>
                      setNewTask({ ...newTask, title: event.target.value })
                    }
                  />
                </label>

                <div className="form-row">
                  <label>
                    Project
                    <select
                      required
                      value={newTask.project}
                      onChange={event =>
                        setNewTask({ ...newTask, project: event.target.value })
                      }
                    >
                      {projects.map(project => (
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
                      onChange={event =>
                        setNewTask({ ...newTask, assignee: event.target.value })
                      }
                    >
                      {members.map(member => (
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
                      onChange={event =>
                        setNewTask({ ...newTask, priority: event.target.value })
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
                      onChange={event =>
                        setNewTask({ ...newTask, due: event.target.value })
                      }
                    />
                  </label>
                </div>

                <label>
                  Status
                  <select
                    value={newTask.status}
                    onChange={event =>
                      setNewTask({ ...newTask, status: event.target.value })
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
                  <button className="button button-primary" type="submit">
                    <Plus size={15} /> Create task
                  </button>
                </div>
              </form>
            ) : (
              <form className="modal-form" onSubmit={createProject}>
                <label>
                  Project name
                  <input
                    autoFocus
                    required
                    maxLength={100}
                    placeholder="e.g. Campus Innovation Lab"
                    value={newProject.name}
                    onChange={event =>
                      setNewProject({ ...newProject, name: event.target.value })
                    }
                  />
                </label>

                <label>
                  Project type
                  <select
                    value={newProject.tag}
                    onChange={event =>
                      setNewProject({ ...newProject, tag: event.target.value })
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
                  <button className="button button-primary" type="submit">
                    <Plus size={15} /> Create project
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toastError ? 'toast-error' : ''}`}>
          <span className="toast-check">
            {toastError ? <AlertTriangle size={14} /> : <Check size={14} />}
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) {
    return (
      <>
        <style>{globalStyles}</style>
        <div className="loading-screen">
          <LoaderCircle className="spin" size={25} />
          <p>Loading SyncSpace…</p>
        </div>
      </>
    );
  }

  if (!user) return <AuthScreen />;

  return <Dashboard key={user.uid} user={user} />;
}

export default App;

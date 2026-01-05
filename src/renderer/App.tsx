import { Routes, Route, NavLink, Navigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { BarChart3, FileText, Kanban, Settings, FolderPlus, BookOpen, GraduationCap } from 'lucide-react';
import { Button } from './components/ui/button';
import { Label } from './components/ui/label';
import { KanbanBoard, EpicListPanel, TaskDetailPanel } from './components/kanban';
import { PipelineBoard, BriefDetailView, AgentActivityPanel } from './components/pipeline';
import { BriefsList, BriefFullDetail } from './components/briefs';
import { DocsPage } from './components/docs/DocsPage';
import { GuidePage } from './components/guide/GuidePage';
import DragDropZone from './components/common/DragDropZone';
import { ProjectChip } from './components/common/ProjectChip';
import { ProjectTabBar } from './components/common/ProjectTabBar';
import { SetupIncompleteState } from './components/common/SetupIncompleteState';
import type { Project } from '../shared/types/settings';
import type { SetupStatus } from '../shared/types/ipc';
import { useBeadsStore } from './store/beadsStore';
import discoveryClient from './lib/discoveryClient';

// Briefs view with list and detail panels
function BriefsView() {
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);

  return (
    <div className="flex h-full">
      <div className="w-80 min-w-80 flex-shrink-0">
        <BriefsList
          onSelectBrief={setSelectedBriefId}
          selectedBriefId={selectedBriefId}
        />
      </div>
      <div className="flex-1 flex bg-slate-950">
        <BriefFullDetail briefId={selectedBriefId} />
      </div>
    </div>
  );
}

function SettingsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setActiveProject, activeProjectId, loadProjects: refreshBeadsStore } = useBeadsStore();

  // Load projects on mount
  useEffect(() => {
    async function loadProjects() {
      try {
        const settings = await window.electron.settings.get('all');
        if (settings?.projects) {
          setProjects(settings.projects);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
        setError('Failed to load projects');
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Add a new project
  const addProject = useCallback(async (path: string) => {
    // Extract project name from path (last segment)
    const name = path.split('/').pop() || path.split('\\').pop() || 'Unknown Project';

    // Check if project already exists
    if (projects.some(p => p.path === path)) {
      setError('This project is already added');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      path,
      addedAt: new Date().toISOString(),
      isActive: projects.length === 0, // Make first project active
    };

    const updatedProjects = [...projects, newProject];

    try {
      await window.electron.settings.set('projects', updatedProjects);
      setProjects(updatedProjects);

      // If this is the first project, set it as active
      if (newProject.isActive) {
        await window.electron.settings.set('beadsProjectPath', newProject.path);
        setActiveProject(newProject.id);
      }

      // Sync with beadsStore so sidebar updates
      await refreshBeadsStore();
    } catch (err) {
      console.error('Failed to add project:', err);
      setError('Failed to add project');
      setTimeout(() => setError(null), 3000);
    }
  }, [projects, setActiveProject, refreshBeadsStore]);

  // Remove a project
  const removeProject = useCallback(async (projectId: string) => {
    const projectToRemove = projects.find(p => p.id === projectId);
    const updatedProjects = projects.filter(p => p.id !== projectId);

    // If we're removing the active project, make another one active
    if (projectToRemove?.isActive && updatedProjects.length > 0) {
      updatedProjects[0].isActive = true;
    }

    try {
      await window.electron.settings.set('projects', updatedProjects);
      setProjects(updatedProjects);

      // If the removed project was active, switch to a new one
      if (projectToRemove?.isActive) {
        if (updatedProjects.length > 0) {
          await window.electron.settings.set('beadsProjectPath', updatedProjects[0].path);
          setActiveProject(updatedProjects[0].id);
        } else {
          await window.electron.settings.set('beadsProjectPath', '');
          setActiveProject(null);
        }
      }

      // Sync with beadsStore so sidebar updates
      await refreshBeadsStore();
    } catch (err) {
      console.error('Failed to remove project:', err);
      setError('Failed to remove project');
      setTimeout(() => setError(null), 3000);
    }
  }, [projects, setActiveProject, refreshBeadsStore]);

  // Handle folder picker button click
  const handleFolderPicker = useCallback(async () => {
    try {
      const result = await window.electron.dialog.selectFolder();
      if (result.paths && result.paths.length > 0) {
        addProject(result.paths[0]);
      }
    } catch (err) {
      console.error('Failed to open folder picker:', err);
      setError('Failed to open folder picker');
      setTimeout(() => setError(null), 3000);
    }
  }, [addProject]);

  // Handle drag-drop folder addition
  const handleFolderDrop = useCallback((path: string) => {
    addProject(path);
  }, [addProject]);

  // Handle project chip click (set as active)
  const handleProjectClick = useCallback(async (project: Project) => {
    // Update local state
    const updatedProjects = projects.map(p => ({
      ...p,
      isActive: p.id === project.id,
    }));

    try {
      await window.electron.settings.set('projects', updatedProjects);
      await window.electron.settings.set('beadsProjectPath', project.path);
      setProjects(updatedProjects);
      setActiveProject(project.id);
    } catch (err) {
      console.error('Failed to set active project:', err);
      setError('Failed to set active project');
      setTimeout(() => setError(null), 3000);
    }
  }, [projects, setActiveProject]);

  if (loading) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4 text-slate-100">Settings</h1>
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 text-slate-100">Settings</h1>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Projects Section */}
        <div>
          <Label className="text-slate-200 text-lg font-semibold">
            Projects
          </Label>
          <p className="text-sm text-slate-400 mt-1 mb-4">
            Add projects that contain a <code className="bg-slate-800 px-1 rounded text-slate-300">.beads</code> folder (where you ran <code className="bg-slate-800 px-1 rounded text-slate-300">bd init</code>)
          </p>

          {/* Project List */}
          {projects.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
                Your Projects ({projects.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {projects.map((project, index) => (
                  <div
                    key={project.id}
                    className={`relative ${project.id === activeProjectId ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-slate-950 rounded-md' : ''}`}
                  >
                    <ProjectChip
                      project={project.name}
                      index={index}
                      onClick={() => handleProjectClick(project)}
                      onRemove={() => removeProject(project.id)}
                    />
                    {project.id === activeProjectId && (
                      <span className="absolute -top-2 -right-2 w-2 h-2 bg-sky-500 rounded-full" />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Click a project to make it active. Active project is highlighted.
              </p>
            </div>
          )}

          {/* Add Project Section */}
          <div className="space-y-4">
            {/* Folder Picker Button */}
            <Button
              onClick={handleFolderPicker}
              className="bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              Add Project Folder
            </Button>

            {/* Drag Drop Zone */}
            <div className="mt-4">
              <DragDropZone onFolderDrop={handleFolderDrop} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pipeline view with side panel
function PipelineView() {
  const [setupStatus, setSetupStatus] = useState<SetupStatus>('ready');
  const [checkingStatus, setCheckingStatus] = useState(true);
  const { activeProjectId, projects } = useBeadsStore();

  // Check setup status when active project changes
  useEffect(() => {
    async function checkSetupStatus() {
      const activeProject = projects.find((p) => p.id === activeProjectId);

      if (!activeProject) {
        setCheckingStatus(false);
        return;
      }

      try {
        setCheckingStatus(true);
        const result = await window.electron.project.checkSetupStatus(activeProject.path);
        setSetupStatus(result.status);
      } catch (err) {
        console.error('Failed to check setup status:', err);
        // On error, assume ready to avoid blocking UI
        setSetupStatus('ready');
      } finally {
        setCheckingStatus(false);
      }
    }

    checkSetupStatus();
  }, [activeProjectId, projects]);

  // Show loading while checking
  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Checking setup status...
        </div>
      </div>
    );
  }

  // Show setup incomplete state if not ready
  if (setupStatus !== 'ready') {
    const activeProject = projects.find((p) => p.id === activeProjectId);
    return <SetupIncompleteState status={setupStatus} projectPath={activeProject?.path} />;
  }

  // Normal pipeline view
  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-hidden">
        <PipelineBoard />
      </div>
      <div className="w-96 border-l border-slate-800 overflow-y-auto">
        <BriefDetailView />
        <div className="border-t border-slate-800 p-4">
          <AgentActivityPanel />
        </div>
      </div>
    </div>
  );
}

// Kanban view with 3-panel layout: Epic List | Board | Task Details
function KanbanView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEpic = useBeadsStore((state) => state.selectedEpic);
  const batches = useBeadsStore((state) => state.batches);
  const issuesWithDeps = useBeadsStore((state) => state.issuesWithDeps);
  const issues = useBeadsStore((state) => state.issues);

  // Get epic filter from URL
  const epicIdFromUrl = searchParams.get('epicId');

  // Get all epics for the sidebar list
  const allEpics = issues.filter((i) => i.issue_type === 'epic');

  // Get active epics (open, in_progress, blocked)
  const activeEpics = allEpics.filter(
    (e) => e.status === 'open' || e.status === 'in_progress' || e.status === 'blocked'
  );

  // Auto-select first active epic if none selected
  useEffect(() => {
    if (!epicIdFromUrl && activeEpics.length > 0) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('epicId', activeEpics[0].id);
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [epicIdFromUrl, activeEpics, searchParams, setSearchParams]);

  // Calculate task counts per epic
  const taskCounts = allEpics.reduce((acc, epic) => {
    acc[epic.id] = issues.filter((i) => i.parent === epic.id && i.issue_type === 'task').length;
    return acc;
  }, {} as Record<string, number>);

  // Determine if we should show task detail
  const isTaskSelected = selectedEpic?.issue_type === 'task';

  // Find dependencies for selected task
  const selectedTaskDeps = isTaskSelected
    ? (() => {
        const taskWithDeps = issuesWithDeps.find((t) => t.id === selectedEpic?.id);
        const depIds = taskWithDeps?.blockedBy || [];
        return issuesWithDeps.filter((t) => depIds.includes(t.id));
      })()
    : [];

  // Find batch for selected task
  const selectedTaskBatch = isTaskSelected
    ? batches.find((b) => b.taskIds.includes(selectedEpic?.id || ''))
    : undefined;

  // Handle epic selection from left sidebar - updates URL
  const handleEpicSelect = useCallback((epicId: string | null) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (epicId) {
      newSearchParams.set('epicId', epicId);
    } else {
      newSearchParams.delete('epicId');
    }
    setSearchParams(newSearchParams, { replace: true });
    // Clear any selected task when changing epics
    useBeadsStore.getState().clearSelection();
  }, [searchParams, setSearchParams]);

  return (
    <div className="flex h-full">
      {/* Left panel: Epic list */}
      <div className="w-56 flex-shrink-0 border-r border-slate-800">
        <EpicListPanel
          epics={allEpics}
          selectedEpicId={epicIdFromUrl}
          onEpicSelect={handleEpicSelect}
          taskCounts={taskCounts}
        />
      </div>

      {/* Center: Kanban board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard />
      </div>

      {/* Right panel: Task details (only when task selected) */}
      {isTaskSelected && selectedEpic && (
        <div className="w-80 flex-shrink-0 border-l border-slate-800 overflow-y-auto">
          <TaskDetailPanel
            task={selectedEpic}
            batch={selectedTaskBatch}
            dependencies={selectedTaskDeps}
            onClose={() => useBeadsStore.getState().clearSelection()}
          />
        </div>
      )}
    </div>
  );
}

// Main App component
export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { projects, activeProjectId, setActiveProject, isSwitchingProject } = useBeadsStore();

  // Initialize stores on app startup - runs only once
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        // Load projects and set active project in beadsStore
        await useBeadsStore.getState().loadProjects();

        // Get active project from settings to set discovery database path
        const settings = await window.electron.settings.get('all');
        const projects = settings?.projects ?? [];
        const activeProject = projects.find((p: { isActive?: boolean }) => p.isActive) ?? projects[0];

        if (activeProject) {
          // Use .parade/discovery.db path - main process handles fallback to legacy location
          const discoveryDbPath = `${activeProject.path}/.parade/discovery.db`;
          await discoveryClient.setDatabasePath(discoveryDbPath);
          console.log('App initialized with project:', activeProject.name);
        }
      } catch (err) {
        console.error('Failed to initialize app:', err);
      } finally {
        if (mounted) {
          setIsInitialized(true);
        }
      }
    }
    initialize();

    return () => {
      mounted = false;
    };
  }, []); // Empty deps - run only once on mount

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <nav className="w-56 bg-slate-950 border-r border-slate-800 flex flex-col">
        {/* Logo/Title */}
        <div className="p-4 border-b border-slate-800">
          <div className="text-lg font-bold text-slate-100">Parade</div>
          <p className="text-xs text-slate-400">Workflow orchestration for Claude Code</p>
        </div>

        {/* Project Switcher */}
        <div className="p-3 border-b border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2 px-3">Projects</p>
          <ProjectTabBar
            projects={projects}
            activeProjectId={activeProjectId}
            onProjectSelect={(projectId) => setActiveProject(projectId)}
          />
        </div>

        {/* Navigation Links */}
        <div className="flex-1 p-3 space-y-1">
          <NavLink
            to="/pipeline"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-900/30 text-sky-400'
                  : 'text-slate-400 hover:bg-slate-900'
              }`
            }
          >
            <BarChart3 className="w-5 h-5" />
            Pipeline
          </NavLink>
          <NavLink
            to="/briefs"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-900/30 text-sky-400'
                  : 'text-slate-400 hover:bg-slate-900'
              }`
            }
          >
            <FileText className="w-5 h-5" />
            Briefs
          </NavLink>
          <NavLink
            to="/kanban"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-900/30 text-sky-400'
                  : 'text-slate-400 hover:bg-slate-900'
              }`
            }
          >
            <Kanban className="w-5 h-5" />
            Kanban
          </NavLink>
          <NavLink
            to="/docs"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-900/30 text-sky-400'
                  : 'text-slate-400 hover:bg-slate-900'
              }`
            }
          >
            <BookOpen className="w-5 h-5" />
            Docs
          </NavLink>
          <NavLink
            to="/guide"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-900/30 text-sky-400'
                  : 'text-slate-400 hover:bg-slate-900'
              }`
            }
          >
            <GraduationCap className="w-5 h-5" />
            Guide
          </NavLink>
        </div>

        {/* Bottom section */}
        <div className="p-3 border-t border-slate-800">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-900/30 text-sky-400'
                  : 'text-slate-400 hover:bg-slate-900'
              }`
            }
          >
            <Settings className="w-5 h-5" />
            Settings
          </NavLink>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden relative">
        {/* Loading overlay during project switch */}
        {isSwitchingProject && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Switching project...</span>
            </div>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Navigate to="/pipeline" replace />} />
          <Route path="/pipeline" element={<PipelineView />} />
          <Route path="/briefs" element={<BriefsView />} />
          <Route path="/kanban" element={<KanbanView />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </main>
    </div>
  );
}

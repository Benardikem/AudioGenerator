import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  ListTodo,
  ExternalLink,
  LogOut,
  Sparkles,
  Calendar,
  AlertCircle,
  Loader2,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  fetchTaskLists,
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  createTaskList,
} from '../services/googleTasks';
import { googleSignIn, logout, initAuth } from '../services/auth';
import { GoogleTask, GoogleTaskList } from '../types';
import { ConfirmationModal } from './ConfirmationModal';

interface GoogleTasksPanelProps {
  currentCommercialTitle?: string;
}

const RECOMMENDED_TASKS = [
  {
    title: 'Review Legit Africa 30s radio commercial audio master',
    notes: 'Verify clarity of "Search the business. Say what happened. Good or bad. Legit Africa dot com."',
  },
  {
    title: 'Dispatch commercial WAV audio to local radio & podcast stations',
    notes: 'Include broadcast traffic instructions and scheduled morning drive-time slots.',
  },
  {
    title: 'Launch "Save Someone\'s Money" social audio teaser',
    notes: 'Post audio snippet with subtitle waveform video across Instagram, TikTok, and X.',
  },
  {
    title: 'Audit live review submission funnel on Legit Africa',
    notes: 'Confirm fraud checks and ensure no vendor can pay to remove reviews.',
  },
];

export const GoogleTasksPanel: React.FC<GoogleTasksPanelProps> = ({
  currentCommercialTitle = 'Legit Africa 30s Spot',
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('@default');
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // New list form
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Confirmation Modal state for destructive/modifying operations (MANDATORY per Workspace Skill)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (u, token) => {
        setUser(u);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load task lists once authenticated
  useEffect(() => {
    if (accessToken) {
      loadTaskLists();
    }
  }, [accessToken]);

  // Load tasks when selected list changes
  useEffect(() => {
    if (accessToken && selectedListId) {
      loadTasks(selectedListId);
    }
  }, [accessToken, selectedListId]);

  const loadTaskLists = async () => {
    if (!accessToken) return;
    try {
      setError(null);
      const lists = await fetchTaskLists(accessToken);
      setTaskLists(lists);
      if (lists.length > 0 && selectedListId === '@default') {
        setSelectedListId(lists[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load task lists:', err);
      setError(err.message || 'Could not load your Google Tasks.');
    }
  };

  const loadTasks = async (listId: string) => {
    if (!accessToken) return;
    setIsLoadingTasks(true);
    setError(null);
    try {
      const items = await fetchTasks(accessToken, listId);
      setTasks(items);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      setError(err.message || 'Could not load tasks for this list.');
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setTasks([]);
    setTaskLists([]);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newTaskTitle.trim()) return;

    setIsCreatingTask(true);
    setError(null);
    try {
      const created = await createTask(accessToken, selectedListId, {
        title: newTaskTitle.trim(),
        notes: newTaskNotes.trim() || undefined,
      });
      setTasks((prev) => [created, ...prev]);
      setNewTaskTitle('');
      setNewTaskNotes('');
    } catch (err: any) {
      console.error('Task creation failed:', err);
      setError(err.message || 'Failed to create task.');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleCreateNewList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newListName.trim()) return;

    try {
      const created = await createTaskList(accessToken, newListName.trim());
      setTaskLists((prev) => [...prev, created]);
      setSelectedListId(created.id);
      setNewListName('');
      setShowNewListInput(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create task list.');
    }
  };

  // Mandatory Confirmation Dialog for Destructive Delete
  const requestDeleteTask = (task: GoogleTask) => {
    setModalConfig({
      title: 'Delete Google Task?',
      message: `Are you sure you want to permanently delete "${task.title}" from your Google Tasks? This action cannot be undone.`,
      confirmLabel: 'Delete Task',
      isDestructive: true,
      onConfirm: async () => {
        setModalOpen(false);
        if (!accessToken) return;
        try {
          await deleteTask(accessToken, selectedListId, task.id);
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
        } catch (err: any) {
          setError(err.message || 'Failed to delete task.');
        }
      },
    });
    setModalOpen(true);
  };

  // Toggle task status
  const handleToggleTaskStatus = async (task: GoogleTask) => {
    if (!accessToken) return;
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      await updateTask(accessToken, selectedListId, task.id, {
        status: newStatus,
      });
    } catch (err: any) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      setError(err.message || 'Failed to update task.');
    }
  };

  // Bulk add commercial campaign checklist
  const handleAddCampaignChecklist = async () => {
    if (!accessToken) return;
    setIsLoadingTasks(true);
    setError(null);
    try {
      for (const item of RECOMMENDED_TASKS) {
        await createTask(accessToken, selectedListId, {
          title: item.title,
          notes: item.notes,
        });
      }
      await loadTasks(selectedListId);
    } catch (err: any) {
      setError(err.message || 'Failed to add checklist.');
    } finally {
      setIsLoadingTasks(false);
    }
  };

  return (
    <div
      id="google-tasks-integration-panel"
      className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6"
    >
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EAE3D4]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F4EEE2] text-[#E8A317] flex items-center justify-center">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#181614]">
              Commercial Campaign Tasks
            </h3>
            <p className="text-xs text-[#6B6256]">
              Sync production checklists directly with your Google Tasks account
            </p>
          </div>
        </div>

        {/* Auth State Button */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-800">
                {user.displayName || 'Google User'}
              </div>
              <div className="text-[11px] text-stone-500 font-mono">
                {user.email}
              </div>
            </div>
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt="Avatar"
                className="w-8 h-8 rounded-full border border-stone-200"
              />
            )}
            <button
              id="google-signout-btn"
              onClick={handleSignOut}
              className="p-2 text-stone-500 hover:text-red-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>

      {/* When NOT Signed In: Official Google Sign-In Button */}
      {!user ? (
        <div className="text-center py-8 px-4 bg-stone-50/70 rounded-2xl border border-dashed border-stone-300 space-y-4">
          <div className="max-w-md mx-auto space-y-2">
            <h4 className="text-sm font-bold text-slate-800">
              Connect Google Tasks
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Track broadcast deliverables, radio station deadlines, and review
              launch to-dos alongside your Legit Africa commercial audio.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            {/* Official Google Sign-In Button format as mandated by Workspace Skill */}
            <button
              id="google-signin-btn"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center justify-center gap-3 px-6 py-2.5 bg-white border border-stone-300 hover:border-stone-400 hover:bg-stone-50 rounded-xl shadow-xs transition-all text-slate-700 text-sm font-semibold disabled:opacity-50 cursor-pointer"
            >
              {isSigningIn ? (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              ) : (
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="w-5 h-5"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
              )}
              <span>
                {isSigningIn ? 'Connecting...' : 'Sign in with Google'}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-stone-400">
            Requires permission to view and manage tasks in your Google account.
          </div>
        </div>
      ) : (
        /* When Signed In: Tasks Dashboard */
        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-red-50 text-red-700 rounded-xl border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Task List Selector & Quick Add Checklist */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-stone-500" />
              <label className="text-xs font-semibold text-slate-700">
                Task List:
              </label>
              <select
                id="tasklist-select"
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="text-xs bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-slate-800 font-medium outline-hidden"
              >
                {taskLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowNewListInput(!showNewListInput)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-1"
              >
                + New List
              </button>
            </div>

            <button
              id="add-commercial-checklist-btn"
              onClick={handleAddCampaignChecklist}
              disabled={isLoadingTasks}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-500 rounded-lg transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Add Ad Production Checklist
            </button>
          </div>

          {/* New Task List Form */}
          {showNewListInput && (
            <form
              onSubmit={handleCreateNewList}
              className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-xl border border-blue-200"
            >
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="New List Title (e.g. Legit Africa Ads)"
                className="grow text-xs px-3 py-1.5 bg-white border border-stone-300 rounded-lg outline-hidden"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowNewListInput(false)}
                className="px-2 py-1.5 text-xs text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
            </form>
          )}

          {/* Quick Create Task Form */}
          <form onSubmit={handleCreateTask} className="flex gap-2">
            <input
              id="new-task-title-input"
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add task for this commercial (e.g. Publish 4:5 video on TikTok)..."
              className="grow px-3.5 py-2 text-xs bg-[#FBF8F1] border border-[#EAE3D4] rounded-xl outline-hidden focus:ring-2 focus:ring-[#E8A317] focus:bg-white transition-all text-[#181614]"
            />
            <button
              id="create-task-submit-btn"
              type="submit"
              disabled={isCreatingTask || !newTaskTitle.trim()}
              className="px-4 py-2 text-xs font-bold text-[#181614] bg-[#E8A317] hover:bg-[#C6860C] rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {isCreatingTask ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Add Task
            </button>
          </form>

          {/* Task Items List */}
          <div className="space-y-2">
            {isLoadingTasks ? (
              <div className="flex items-center justify-center py-8 text-xs text-[#6B6256] gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#E8A317]" />
                Loading tasks from Google...
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-[#6B6256] text-xs bg-[#FBF8F1] rounded-xl border border-dashed border-[#EAE3D4]">
                No tasks in this list yet. Click "Add Ad Production Checklist" to
                populate commercial to-dos.
              </div>
            ) : (
              tasks.map((task) => {
                const isDone = task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    id={`task-row-${task.id}`}
                    className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-[#F4EEE2] border-[#EAE3D4] opacity-60'
                        : 'bg-white border-[#EAE3D4] hover:border-[#E8A317] shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3 grow">
                      <button
                        type="button"
                        onClick={() => handleToggleTaskStatus(task)}
                        className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                          isDone
                            ? 'bg-[#E8A317] border-[#E8A317] text-[#181614]'
                            : 'border-[#EAE3D4] hover:border-[#E8A317] bg-white'
                        }`}
                      >
                        {isDone && <CheckSquare className="w-3.5 h-3.5" />}
                      </button>
                      <div>
                        <div
                          className={`text-xs font-semibold ${
                            isDone
                              ? 'line-through text-stone-500'
                              : 'text-slate-800'
                          }`}
                        >
                          {task.title}
                        </div>
                        {task.notes && (
                          <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">
                            {task.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      id={`delete-task-btn-${task.id}`}
                      type="button"
                      onClick={() => requestDeleteTask(task)}
                      className="text-stone-400 hover:text-red-600 p-1 rounded-md transition-colors shrink-0"
                      title="Delete task from Google"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Modal for Destructive Workspace operations */}
      <ConfirmationModal
        isOpen={modalOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmLabel={modalConfig.confirmLabel}
        isDestructive={modalConfig.isDestructive}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Edit3,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PriorityLevel, Task } from '../types';
import {
  formatShortDate,
  isTaskDueToday,
  isTaskOverdue,
  isTaskUpcoming,
  toLocalDateKey,
} from '../utils/dateUtils';

type TaskFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
type TaskSort = 'created_desc' | 'due_asc' | 'priority_desc';

const PRIORITY_WEIGHT: Record<PriorityLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const TasksPage: React.FC = () => {
  const { tasks, subjects, createTask, updateTask, deleteTask, timer } = useApp();
  const navigate = useNavigate();

  // Filter, Sort, Search UI state (purely view-level — never mutates stored tasks)
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<TaskSort>('created_desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [subjectId, setSubjectId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation state
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const todayKey = toLocalDateKey(new Date());
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);

  const openCreateForm = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setSubjectId('');
    setDueDate('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setSubjectId(task.subject_id || '');
    setDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Task title is required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: title.trim(),
          description: description.trim(),
          priority,
          subject_id: subjectId || null,
          due_date: dueDate || null,
        });
      } else {
        await createTask({
          title: title.trim(),
          description: description.trim(),
          priority,
          subject_id: subjectId || null,
          due_date: dueDate || null,
        });
      }
      setIsFormOpen(false);
      setEditingTask(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    await updateTask(task.id, { status: nextStatus });
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    const id = taskToDelete.id;
    setTaskToDelete(null);
    await deleteTask(id);
  };

  const handleFocusOnTask = (task: Task) => {
    timer.setSelectedTaskId(task.id);
    if (task.subject_id) {
      timer.setSelectedSubjectId(task.subject_id);
    }
    navigate('/timer');
  };

  const filteredAndSortedTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (filter === 'today' && !isTaskDueToday(t.due_date, todayKey)) return false;
        if (filter === 'upcoming' && !isTaskUpcoming(t.due_date, t.status, todayKey)) return false;
        if (filter === 'overdue' && !isTaskOverdue(t.due_date, t.status, todayKey)) return false;
        if (filter === 'completed' && t.status !== 'completed') return false;

        if (subjectFilter !== 'all') {
          if (subjectFilter === 'unassigned' && t.subject_id !== null) return false;
          if (subjectFilter !== 'unassigned' && t.subject_id !== subjectFilter) return false;
        }

        if (q) {
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchDesc = (t.description || '').toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority_desc') {
          const diff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
          if (diff !== 0) return diff;
        }
        if (sortBy === 'due_asc') {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [tasks, filter, subjectFilter, sortBy, searchQuery, todayKey]);

  const filterCounts = useMemo(() => {
    return {
      all: tasks.length,
      today: tasks.filter((t) => isTaskDueToday(t.due_date, todayKey)).length,
      upcoming: tasks.filter((t) => isTaskUpcoming(t.due_date, t.status, todayKey)).length,
      overdue: tasks.filter((t) => isTaskOverdue(t.due_date, t.status, todayKey)).length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    };
  }, [tasks, todayKey]);

  return (
    <div className="space-y-6">
      {/* Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
            Task Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize deadlines, priorities, and subjects for focused execution
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Create Task</span>
        </button>
      </div>

      {/* Create / Edit Modal Form */}
      {isFormOpen && (
        <form
          onSubmit={handleFormSubmit}
          className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Close task form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{formError}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="task-title-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Task Title *
              </label>
              <input
                id="task-title-input"
                type="text"
                required
                placeholder="e.g., Implement binary search tree balancing"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="task-desc-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Description
              </label>
              <textarea
                id="task-desc-input"
                rows={2}
                placeholder="Add notes, acceptance criteria, or chapter references..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="task-priority-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Priority
              </label>
              <select
                id="task-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="task-subject-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Subject
              </label>
              <select
                id="task-subject-select"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">Unassigned</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="task-duedate-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Deadline (Optional)
              </label>
              <input
                id="task-duedate-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {submitting ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs, Search & Sort Controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Interactive Segmented Filter Controls */}
          <div
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
            role="tablist"
            aria-label="Filter tasks by status or deadline"
          >
            {(
              [
                { id: 'all', label: 'All', count: filterCounts.all },
                { id: 'today', label: 'Today', count: filterCounts.today },
                { id: 'upcoming', label: 'Upcoming', count: filterCounts.upcoming },
                { id: 'overdue', label: 'Overdue', count: filterCounts.overdue },
                { id: 'completed', label: 'Completed', count: filterCounts.completed },
              ] as Array<{ id: TaskFilter; label: string; count: number }>
            ).map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="ml-1.5 font-mono tabular-nums text-[11px] opacity-75">
                    ({tab.count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Sort */}
          <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial justify-end">
            <div className="relative flex-1 sm:w-56">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Search tasks"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <select
              aria-label="Filter by subject"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Subjects</option>
              <option value="unassigned">Unassigned</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort tasks"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as TaskSort)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="created_desc">Newest First</option>
              <option value="due_asc">Earliest Deadline</option>
              <option value="priority_desc">Highest Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
        {filteredAndSortedTasks.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {tasks.length === 0
                ? 'Your task list is empty'
                : 'No tasks match your current filter or search'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {tasks.length === 0
                ? 'Create your first task with a priority level, deadline, and subject to organize your study plan.'
                : 'Try clearing your search query or switching to the All filter tab.'}
            </p>
            {tasks.length === 0 && (
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Task</span>
              </button>
            )}
          </div>
        ) : (
          filteredAndSortedTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const overdue = isTaskOverdue(task.due_date, task.status, todayKey);
            const dueToday = isTaskDueToday(task.due_date, todayKey);
            const subjectName = task.subject_id ? subjectMap.get(task.subject_id) : null;

            return (
              <div
                key={task.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(task)}
                    aria-label={
                      isCompleted ? `Reopen task "${task.title}"` : `Mark "${task.title}" completed`
                    }
                    className="mt-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isCompleted
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Zero-Pill Unboxed Metadata Line */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span
                        className={`font-medium capitalize ${
                          task.priority === 'high'
                            ? 'text-red-600 dark:text-red-400'
                            : task.priority === 'medium'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {task.priority} priority
                      </span>

                      {subjectName && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{subjectName}</span>
                        </>
                      )}

                      {task.due_date && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-mono tabular-nums ${
                              overdue
                                ? 'text-red-600 dark:text-red-400 font-medium'
                                : dueToday
                                ? 'text-amber-600 dark:text-amber-400 font-medium'
                                : ''
                            }`}
                          >
                            {overdue
                              ? `Overdue (${formatShortDate(task.due_date)})`
                              : dueToday
                              ? 'Due Today'
                              : `Due ${formatShortDate(task.due_date)}`}
                          </span>
                        </>
                      )}

                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{task.status}</span>
                    </div>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => handleFocusOnTask(task)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      title="Focus on this task in Pomodoro Timer"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Focus</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openEditForm(task)}
                    aria-label={`Edit task "${task.title}"`}
                    className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setTaskToDelete(task)}
                    aria-label={`Delete task "${task.title}"`}
                    className="p-2 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Destructive Action Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(taskToDelete)}
        title="Delete Task"
        description={
          taskToDelete
            ? `Are you sure you want to permanently delete "${taskToDelete.title}"? Completed focus sessions linked to this task will be preserved.`
            : ''
        }
        confirmLabel="Delete Task"
        onConfirm={handleConfirmDelete}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
};

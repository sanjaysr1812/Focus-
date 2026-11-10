import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Code2,
  Cpu,
  Edit3,
  FolderKanban,
  Play,
  Plus,
  Sigma,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Subject } from '../types';
import { calculateSubjectStats } from '../utils/analyticsEngine';
import { formatDurationHuman } from '../utils/dateUtils';

const SUBJECT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Code2,
  Sigma,
  Cpu,
  FolderKanban,
};

const EXAMPLE_SUBJECT_TEMPLATES = [
  {
    name: 'Programming',
    description: 'Software engineering, algorithms, and full-stack development practice.',
    icon: 'Code2',
  },
  {
    name: 'Mathematics',
    description: 'Calculus, linear algebra, discrete math, and problem sets.',
    icon: 'Sigma',
  },
  {
    name: 'Data Structures',
    description: 'Trees, graphs, dynamic programming, and complexity analysis.',
    icon: 'Cpu',
  },
  {
    name: 'Physics',
    description: 'Classical mechanics, electromagnetism, and laboratory coursework.',
    icon: 'BookOpen',
  },
  {
    name: 'Personal Projects',
    description: 'Independent research, side projects, and portfolio builds.',
    icon: 'FolderKanban',
  },
];

export const SubjectsPage: React.FC = () => {
  const { subjects, sessions, tasks, createSubject, updateSubject, deleteSubject, timer } =
    useApp();
  const navigate = useNavigate();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconName, setIconName] = useState('BookOpen');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  const subjectStats = useMemo(
    () => calculateSubjectStats(subjects, sessions, tasks),
    [subjects, sessions, tasks]
  );

  const openCreateForm = () => {
    setEditingSubject(null);
    setName('');
    setDescription('');
    setIconName('BookOpen');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (subject: Subject) => {
    setEditingSubject(subject);
    setName(subject.name);
    setDescription(subject.description || '');
    setIconName(subject.icon || 'BookOpen');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Subject name is required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, {
          name: name.trim(),
          description: description.trim(),
          icon: iconName,
        });
      } else {
        await createSubject({
          name: name.trim(),
          description: description.trim(),
          icon: iconName,
        });
      }
      setIsFormOpen(false);
      setEditingSubject(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save subject.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return;
    const id = subjectToDelete.id;
    setSubjectToDelete(null);
    await deleteSubject(id);
  };

  const handleQuickSeedExamples = async () => {
    setSubmitting(true);
    try {
      const existingNames = new Set(subjects.map((s) => s.name.toLowerCase()));
      for (const item of EXAMPLE_SUBJECT_TEMPLATES) {
        if (!existingNames.has(item.name.toLowerCase())) {
          await createSubject(item);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartFocusForSubject = (subjectId: string) => {
    timer.setSelectedSubjectId(subjectId);
    navigate('/timer');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
            Subject Tracker
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track total focus duration, completed sessions, and tasks across your subjects
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {subjects.length === 0 && (
            <button
              type="button"
              onClick={handleQuickSeedExamples}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Add Starter Subjects</span>
            </button>
          )}
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>New Subject</span>
          </button>
        </div>
      </div>

      {/* Create / Edit Subject Form */}
      {isFormOpen && (
        <form
          onSubmit={handleFormSubmit}
          className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {editingSubject ? 'Edit Subject' : 'Create Subject'}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Close subject form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{formError}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="subject-name-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Subject Name *
              </label>
              <input
                id="subject-name-input"
                type="text"
                required
                placeholder="e.g., Data Structures, Organic Chemistry"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="subject-icon-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Icon Style
              </label>
              <select
                id="subject-icon-select"
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="BookOpen">Book / General</option>
                <option value="Code2">Programming / Code</option>
                <option value="Sigma">Mathematics / Formula</option>
                <option value="Cpu">Systems / Hardware</option>
                <option value="FolderKanban">Projects / Research</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="subject-desc-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Description
              </label>
              <textarea
                id="subject-desc-input"
                rows={2}
                placeholder="What topics or coursework belong to this subject?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
              {submitting ? 'Saving...' : editingSubject ? 'Save Changes' : 'Create Subject'}
            </button>
          </div>
        </form>
      )}

      {/* Subjects Grid */}
      {subjectStats.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-14 px-6 text-center">
          <BookOpen className="h-9 w-9 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            No subjects created yet
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Create subjects like Programming, Mathematics, Data Structures, Physics, or Personal
            Projects to measure how your study hours are distributed.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleQuickSeedExamples}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Load 5 Example Subjects</span>
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Custom Subject</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjectStats.map((stat) => {
            const { subject, totalFocusSeconds, completedFocusSessions, totalTasks, completedTasks } =
              stat;
            const IconComponent = SUBJECT_ICONS[subject.icon || 'BookOpen'] || BookOpen;

            return (
              <div
                key={subject.id}
                className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {subject.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {completedFocusSessions}{' '}
                          {completedFocusSessions === 1 ? 'session' : 'sessions'} · {totalTasks}{' '}
                          {totalTasks === 1 ? 'task' : 'tasks'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditForm(subject)}
                        aria-label={`Edit subject ${subject.name}`}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubjectToDelete(subject)}
                        aria-label={`Delete subject ${subject.name}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[2rem]">
                    {subject.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-left">
                    <div>
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                        Focus Time
                      </span>
                      <span className="text-sm font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {formatDurationHuman(totalFocusSeconds)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                        Sessions
                      </span>
                      <span className="text-sm font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {completedFocusSessions}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                        Tasks Done
                      </span>
                      <span className="text-sm font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {completedTasks}/{totalTasks}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartFocusForSubject(subject.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/80 rounded-lg transition-colors"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Start Focus in {subject.name}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(subjectToDelete)}
        title="Delete Subject"
        description={
          subjectToDelete
            ? `Are you sure you want to delete "${subjectToDelete.name}"? Existing tasks and completed focus sessions will remain in your workspace as unassigned.`
            : ''
        }
        confirmLabel="Delete Subject"
        onConfirm={handleConfirmDelete}
        onCancel={() => setSubjectToDelete(null)}
      />
    </div>
  );
};

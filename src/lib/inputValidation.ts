import type { Subtask, TaskCategory, TaskPriority } from '../types';

export const TASK_CATEGORIES: TaskCategory[] = [
  'ID/Passport',
  'Bills',
  'Employment',
  'Scholarships',
  'Assignments',
  'Car',
  'Health',
  'Government',
  'Personal',
  'Other',
];

export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

export const TASK_INPUT_LIMITS = {
  title: 200,
  description: 2000,
  subtaskTitle: 160,
  subtasks: 50,
  search: 120,
};

const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;
const minTaskDate = new Date(2000, 0, 1);
const maxTaskDate = new Date(2100, 11, 31, 23, 59, 59, 999);

export function clampTextInput(value: string, maxLength: number) {
  return value.slice(0, maxLength);
}

export function sanitizeSingleLineInput(value: string, maxLength: number) {
  return value
    .normalize('NFKC')
    .replace(controlCharacters, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeMultiLineInput(value: string, maxLength: number) {
  return value
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(controlCharacters, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function parseBoundedDate(value: string) {
  if (!datePattern.test(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  if (date < minTaskDate || date > maxTaskDate) {
    return null;
  }

  return date;
}

export function parseBoundedDateTime(dateValue: string, timeValue: string) {
  const date = parseBoundedDate(dateValue);
  if (!date || !timePattern.test(timeValue)) return null;

  const [hours, minutes] = timeValue.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;

  const dateTime = new Date(date);
  dateTime.setHours(hours, minutes, 0, 0);

  if (dateTime < minTaskDate || dateTime > maxTaskDate) {
    return null;
  }

  return dateTime;
}

export function isTaskCategory(value: string): value is TaskCategory {
  return TASK_CATEGORIES.includes(value as TaskCategory);
}

export function isTaskPriority(value: string): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority);
}

export function sanitizeSubtasks(subtasks: Subtask[]) {
  return subtasks
    .slice(0, TASK_INPUT_LIMITS.subtasks)
    .map((subtask) => ({
      title: sanitizeSingleLineInput(subtask.title, TASK_INPUT_LIMITS.subtaskTitle),
      completed: Boolean(subtask.completed),
    }))
    .filter((subtask) => subtask.title.length > 0);
}

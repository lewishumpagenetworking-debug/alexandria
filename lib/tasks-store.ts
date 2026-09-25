const KEY = "alexandria-tasks-v1";

export type TaskCategory = "reading" | "study" | "application" | "reflection" | "other";

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  notes?: string;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

function read(): Task[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as Task[]; } catch { return []; }
}

function write(tasks: Task[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(tasks));
}

function uid() { return `task-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`; }

export const listTasks = () => read();
export const listActiveTasks = () => read().filter((t) => !t.completed);
export const listCompletedTasks = () => read().filter((t) => t.completed);

export function addTask(input: Omit<Task, "id" | "createdAt" | "completed">): Task {
  const task: Task = { ...input, id: uid(), createdAt: new Date().toISOString(), completed: false };
  write([task, ...read()].slice(0, 500));
  return task;
}

export function completeTask(id: string): void {
  write(read().map((t) => t.id === id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t));
}

export function deleteTask(id: string): void {
  write(read().filter((t) => t.id !== id));
}

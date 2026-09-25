"use client";

import { useEffect, useState } from "react";
import { listTasks, listActiveTasks, addTask, completeTask, deleteTask, type Task, type TaskCategory } from "@/lib/tasks-store";

const CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: "reading", label: "Reading" },
  { value: "study", label: "Study" },
  { value: "application", label: "Application" },
  { value: "reflection", label: "Reflection" },
  { value: "other", label: "Other" },
];

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory>("reading");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");

  function sync() { setTasks(listTasks()); }

  useEffect(() => {
    sync();
    window.addEventListener("alexandria:data", sync);
    return () => window.removeEventListener("alexandria:data", sync);
  }, []);

  function submit() {
    if (!title.trim()) return;
    addTask({ title: title.trim(), category, notes: notes.trim() || undefined, dueDate: dueDate || undefined });
    setTitle("");
    setNotes("");
    setDueDate("");
    setShowAdd(false);
    sync();
  }

  function done(id: string) {
    completeTask(id);
    sync();
  }

  function remove(id: string) {
    deleteTask(id);
    sync();
  }

  const shown = filter === "active" ? tasks.filter((t) => !t.completed) : tasks;
  const activeCount = tasks.filter((t) => !t.completed).length;

  return (
    <section className="view active">
      <div className="content">
        <div className="page-header-row">
          <div>
            <div className="eyebrow">Knowledge</div>
            <h1 className="page-title">Tasks</h1>
            <p className="page-intro">Intellectual commitments — reading goals, study sessions, things to apply or reflect on.</p>
          </div>
          <button className="small-btn primary" onClick={() => setShowAdd(!showAdd)}>+ Add task</button>
        </div>

        {showAdd && (
          <article className="card task-form">
            <h3>New task</h3>
            <div className="form-group">
              <label>Task <span className="req">*</span></label>
              <input
                className="search"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              />
            </div>
            <div className="form-grid">
              <label>Category
                <select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
              <label>Due date (optional)
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </label>
              <label className="form-span">Notes (optional)
                <input className="search" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any context or detail…" />
              </label>
            </div>
            <div className="button-row">
              <button className="small-btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="small-btn primary" disabled={!title.trim()} onClick={submit}>Add task</button>
            </div>
          </article>
        )}

        <div className="tab-row">
          <button className={`tab-btn${filter === "active" ? " active" : ""}`} onClick={() => setFilter("active")}>
            Active {activeCount > 0 && <span className="tab-count">{activeCount}</span>}
          </button>
          <button className={`tab-btn${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
            All {tasks.length > 0 && <span className="tab-count">{tasks.length}</span>}
          </button>
        </div>

        {shown.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h3>{filter === "active" ? "Nothing active" : "No tasks yet"}</h3>
            <p>{filter === "active" ? "All your tasks are complete. Add a new one to keep your learning on track." : "Tasks are intellectual commitments — reading goals, experiments, things to try. Add one to get started."}</p>
          </div>
        ) : (
          <div className="task-list">
            {shown.map((task) => (
              <article key={task.id} className={`card task-item${task.completed ? " completed" : ""}`}>
                <div className="task-row">
                  <button
                    className={`task-check${task.completed ? " done" : ""}`}
                    onClick={() => !task.completed && done(task.id)}
                    aria-label={task.completed ? "Completed" : "Mark complete"}
                  >
                    {task.completed ? "✓" : "○"}
                  </button>
                  <div className="task-body">
                    <p className="task-title">{task.title}</p>
                    <div className="task-meta">
                      <span className={`pill small cat-${task.category}`}>{task.category}</span>
                      {task.dueDate && <span className="meta">due {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                      {task.notes && <span className="meta">· {task.notes}</span>}
                    </div>
                  </div>
                  <button className="ghost-btn remove-btn" onClick={() => remove(task.id)} aria-label="Delete">×</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

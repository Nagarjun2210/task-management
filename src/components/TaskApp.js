"use client";

import { useEffect, useMemo, useState } from "react";

const PRIORITIES = ["low", "medium", "high"];
const PRIORITY_STYLES = {
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};
const FILTERS = ["all", "active", "completed"];
const SORTS = {
  newest: "Newest first",
  due: "Due date",
  priority: "Priority",
};
const RANK = { high: 0, medium: 1, low: 2 };

function dueLabel(due, today) {
  if (!today) return due;
  const diff = Math.round((new Date(due) - new Date(today)) / 86400000);
  if (diff < 0) return `Overdue · ${due}`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due ${due}`;
}

export default function TaskApp() {
  const [tasks, setTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [due, setDue] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const [error, setError] = useState("");

  async function api(url, options) {
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
    api("/api/tasks")
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);

  // optimistic update: apply locally, call server, roll back on failure
  async function mutate(apply, request) {
    const prev = tasks;
    setTasks(apply);
    setError("");
    try {
      await request();
    } catch (e) {
      setTasks(prev);
      setError(e.message);
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tasks.filter(
      (t) =>
        (filter === "all" ? true : filter === "active" ? !t.done : t.done) &&
        (!q || t.title.toLowerCase().includes(q))
    );
    if (sort === "due")
      list.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
    else if (sort === "priority")
      list.sort((a, b) => RANK[a.priority] - RANK[b.priority]);
    return list;
  }, [tasks, filter, query, sort]);
  const remaining = tasks.filter((t) => !t.done).length;
  const percent = tasks.length
    ? Math.round(((tasks.length - remaining) / tasks.length) * 100)
    : 0;

  const cyclePriority = (t) => {
    const next = PRIORITIES[(PRIORITIES.indexOf(t.priority) + 1) % 3];
    mutate(
      (p) => p.map((x) => (x.id === t.id ? { ...x, priority: next } : x)),
      () =>
        api(`/api/tasks/${t.id}`, {
          method: "PATCH",
          body: JSON.stringify({ priority: next }),
        })
    );
  };

  const changeDue = (t, value) =>
    mutate(
      (p) => p.map((x) => (x.id === t.id ? { ...x, due: value } : x)),
      () =>
        api(`/api/tasks/${t.id}`, {
          method: "PATCH",
          body: JSON.stringify({ due: value }),
        })
    );

  async function addTask(e) {
    e.preventDefault();
    const text = title.trim();
    if (!text) return;
    const draft = { title: text, priority, due };
    setTitle("");
    setDue("");
    setError("");
    try {
      const created = await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      setTasks((prev) => [created, ...prev]);
    } catch (err) {
      setTitle(text);
      setError(err.message);
    }
  }

  const toggle = (t) =>
    mutate(
      (p) => p.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)),
      () =>
        api(`/api/tasks/${t.id}`, {
          method: "PATCH",
          body: JSON.stringify({ done: !t.done }),
        })
    );
  const remove = (id) =>
    mutate(
      (p) => p.filter((t) => t.id !== id),
      () => api(`/api/tasks/${id}`, { method: "DELETE" })
    );
  const clearDone = () =>
    mutate(
      (p) => p.filter((t) => !t.done),
      () => api("/api/tasks", { method: "DELETE" })
    );

  function saveEdit(id) {
    const text = editText.trim();
    setEditingId(null);
    if (!text) return;
    mutate(
      (p) => p.map((t) => (t.id === id ? { ...t, title: text } : t)),
      () =>
        api(`/api/tasks/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: text }),
        })
    );
  }

  const field =
    "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {remaining} remaining · {tasks.length} total
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-900/40 dark:text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={addTask} className="mt-6 flex flex-wrap gap-2">
        <input
          className={`${field} min-w-0 flex-1 basis-60`}
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Task title"
        />
        <select
          className={field}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          aria-label="Priority"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="date"
          className={field}
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-label="Due date"
        />
        <button
          type="submit"
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80"
        >
          Add
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-2">
        <input
          type="search"
          className={`${field} min-w-0 flex-1 basis-48`}
          placeholder="Search tasks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tasks"
        />
        <select
          className={field}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort tasks"
        >
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-sm capitalize ${
                filter === f
                  ? "bg-foreground text-background"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={clearDone}
          className="text-sm text-zinc-500 hover:text-foreground"
        >
          Clear completed
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {visible.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
          >
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggle(t)}
              className="h-4 w-4"
              aria-label={`Mark "${t.title}" done`}
            />
            <div className="min-w-0 flex-1">
              {editingId === t.id ? (
                <input
                  autoFocus
                  className={`${field} w-full`}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => saveEdit(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(t.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <button
                  className={`block max-w-full truncate text-left ${
                    t.done ? "text-zinc-400 line-through" : ""
                  }`}
                  onClick={() => {
                    setEditingId(t.id);
                    setEditText(t.title);
                  }}
                  title="Click to edit"
                >
                  {t.title}
                </button>
              )}
              <label className="flex items-center gap-1 text-xs text-zinc-500">
                <span
                  className={
                    !t.done && today && t.due && t.due < today
                      ? "text-red-500"
                      : ""
                  }
                >
                  {t.due ? dueLabel(t.due, today) : "No due date"}
                </span>
                <input
                  type="date"
                  value={t.due || ""}
                  onChange={(e) => changeDue(t, e.target.value)}
                  className="w-5 cursor-pointer bg-transparent opacity-60 hover:opacity-100"
                  aria-label={`Due date for "${t.title}"`}
                />
              </label>
            </div>
            <button
              onClick={() => cyclePriority(t)}
              title="Click to change priority"
              className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_STYLES[t.priority]}`}
            >
              {t.priority}
            </button>
            <button
              onClick={() => remove(t.id)}
              className="text-zinc-400 hover:text-red-500"
              aria-label={`Delete "${t.title}"`}
            >
              ✕
            </button>
          </li>
        ))}
        {loaded && visible.length === 0 && (
          <li className="py-8 text-center text-sm text-zinc-500">
            No tasks here.
          </li>
        )}
      </ul>
    </main>
  );
}

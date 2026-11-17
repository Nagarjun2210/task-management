import { connection } from "next/server";
import { isViewer, readOnlyResponse } from "@/lib/mode";
import { listTasks, addTask, deleteCompleted } from "@/lib/db";

const PRIORITIES = ["low", "medium", "high"];

function fail(e) {
  console.error(e);
  return Response.json({ error: e.message || "Server error" }, { status: 500 });
}

export async function GET() {
  await connection();
  try {
    return Response.json(await listTasks());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request) {
  if (isViewer()) return readOnlyResponse();
  try {
    const b = await request.json();
    const title = String(b.title || "").trim().slice(0, 500);
    if (!title) return Response.json({ error: "Title required" }, { status: 400 });
    const task = {
      id: crypto.randomUUID(),
      title,
      priority: PRIORITIES.includes(b.priority) ? b.priority : "medium",
      assignee: String(b.assignee || "").trim().slice(0, 100),
      due: /^\d{4}-\d{2}-\d{2}$/.test(b.due || "") ? b.due : "",
      done: false,
    };
    await addTask(task);
    return Response.json(task, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}

// DELETE /api/tasks  -> remove all completed tasks
export async function DELETE() {
  if (isViewer()) return readOnlyResponse();
  try {
    await deleteCompleted();
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

import { isViewer, readOnlyResponse } from "@/lib/mode";
import { updateTask, deleteTask } from "@/lib/db";

function fail(e) {
  console.error(e);
  return Response.json({ error: e.message || "Server error" }, { status: 500 });
}

export async function PATCH(request, { params }) {
  if (isViewer()) return readOnlyResponse();
  try {
    const { id } = await params;
    const b = await request.json();
    const patch = {};
    if (typeof b.title === "string" && b.title.trim())
      patch.title = b.title.trim().slice(0, 500);
    if (["low", "medium", "high"].includes(b.priority))
      patch.priority = b.priority;
    if (typeof b.due === "string" && /^(\d{4}-\d{2}-\d{2})?$/.test(b.due))
      patch.due = b.due;
    if (typeof b.assignee === "string")
      patch.assignee = b.assignee.trim().slice(0, 100);
    if (typeof b.done === "boolean") patch.done = b.done;
    const ok = await updateTask(id, patch);
    return ok
      ? Response.json({ ok: true })
      : Response.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_request, { params }) {
  if (isViewer()) return readOnlyResponse();
  try {
    const { id } = await params;
    const ok = await deleteTask(id);
    return ok
      ? Response.json({ ok: true })
      : Response.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    return fail(e);
  }
}

import { MongoClient } from "mongodb";

// Reuse one client across hot reloads (dev) and warm serverless invocations.
let promise = globalThis._mongoClientPromise;

function collection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");
  if (!promise) {
    promise = new MongoClient(uri).connect();
    globalThis._mongoClientPromise = promise;
  }
  return promise.then((c) =>
    c.db(process.env.MONGODB_DB || "taskmanagement").collection("tasks")
  );
}

const toTask = ({ _id, title, priority, due, assignee, done }) => ({
  id: _id,
  title,
  priority,
  due,
  assignee: assignee || "",
  done,
});

export async function listTasks() {
  const col = await collection();
  const docs = await col.find().sort({ createdAt: -1 }).toArray();
  return docs.map(toTask);
}

export async function addTask(task) {
  const col = await collection();
  const { id, ...rest } = task;
  await col.insertOne({ _id: id, ...rest, createdAt: new Date() });
}

export async function updateTask(id, patch) {
  const col = await collection();
  if (!Object.keys(patch).length) return true;
  const res = await col.updateOne({ _id: id }, { $set: patch });
  return res.matchedCount > 0;
}

export async function deleteTask(id) {
  const col = await collection();
  const res = await col.deleteOne({ _id: id });
  return res.deletedCount > 0;
}

export async function deleteCompleted() {
  const col = await collection();
  await col.deleteMany({ done: true });
}

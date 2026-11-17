import TaskApp from "@/components/TaskApp";

export default function Home() {
  return <TaskApp readOnly={process.env.APP_MODE === "viewer"} />;
}

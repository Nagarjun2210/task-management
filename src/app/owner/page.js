import TaskApp from "@/components/TaskApp";

export const metadata = {
  title: "Owner - Task Management",
  robots: { index: false, follow: false },
};

// Owner dashboard: full controls, no login. Anyone with this URL can edit.
export default function OwnerPage() {
  return <TaskApp ownerRoute />;
}

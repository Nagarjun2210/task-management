import TaskApp from "@/components/TaskApp";

export const metadata = {
  title: "Owner - Task Management",
  robots: { index: false, follow: false },
};

// Owner dashboard: shows a login form until the owner signs in.
export default function OwnerPage() {
  return <TaskApp ownerRoute />;
}

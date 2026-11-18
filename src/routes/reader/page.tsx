import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/reader")({ component: ReaderLayout });

function ReaderLayout() {
  return <Outlet />;
}

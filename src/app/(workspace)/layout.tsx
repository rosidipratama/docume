import { WorkspaceShell } from "@/components/workspace-shell";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const folders = await db.folder.findMany({
    where: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }] }, orderBy: { name: "asc" },
    select: { id: true, name: true, visibility: true },
  });
  return <WorkspaceShell userName={user.name} folders={folders}>{children}</WorkspaceShell>;
}

import Link from "next/link";
import { LayoutGrid, LogOut, Plus } from "lucide-react";
import { Brand } from "@/components/brand";
import { DocumentDropzone } from "@/components/document-dropzone";
import { FolderIcon } from "@/components/folder-icon";
import { createBlankDocumentAction, logout } from "@/app/actions";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const folders = await db.folder.findMany({
    where: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }] }, orderBy: { name: "asc" },
    select: { id: true, name: true, visibility: true },
  });
  return <div className="workspace">
    <aside className="sidebar">
      <Brand href="/dashboard" />
      <form action={createBlankDocumentAction}>
        <button className="button primary new-document-button"><Plus size={17} /> New document</button>
      </form>
      <DocumentDropzone />
      <p className="upload-hint muted">Or drag and drop .md files anywhere.</p>
      <nav aria-label="Workspace">
        <Link className="nav-row" href="/dashboard"><LayoutGrid size={17} /> All documents</Link>
        <div className="nav-heading">Folders <Link href="/dashboard?folder=1" aria-label="New folder"><Plus size={16} /></Link></div>
        {folders.map(folder => <Link className="nav-row" key={folder.id} href={"/folders/" + folder.id}><FolderIcon visibility={folder.visibility} size={17} /> {folder.name}</Link>)}
      </nav>
      <div className="sidebar-account"><div className="avatar">{user.name?.[0]?.toUpperCase() ?? "D"}</div><span>{user.name}</span><form action={logout}><button className="icon-button" aria-label="Sign out"><LogOut size={17} /></button></form></div>
    </aside>
    <main className="workspace-main">{children}</main>
  </div>;
}

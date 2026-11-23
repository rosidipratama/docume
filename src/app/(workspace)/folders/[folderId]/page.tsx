import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentList } from "@/components/document-list";
import { FolderIcon } from "@/components/folder-icon";
import { WorkspaceForm } from "@/components/forms";
import { createBlankDocumentAction } from "@/app/actions/documents";
import { requireUser } from "@/app/lib/session";
import { folderAccess, listDocuments } from "@/app/lib/documents";
import { parsePage } from "@/app/lib/api";
import { db } from "@/app/lib/db";

export default async function FolderPage({ params, searchParams }: {
  params: Promise<{ folderId: string }>; searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { folderId } = await params;
  const { q, page: pageParam } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 160) : "";
  const page = parsePage(pageParam);
  const folder = await db.folder.findFirst({ where: { id: folderId, ...folderAccess(user.id) }, select: { id: true, name: true, ownerId: true, visibility: true } });
  if (!folder) notFound();
  const isOwner = folder.ownerId === user.id;
  const [result, members] = await Promise.all([
    listDocuments(user.id, query, page, folder.id),
    isOwner ? db.folderMember.findMany({ where: { folderId }, select: { role: true, user: { select: { username: true } } }, orderBy: { createdAt: "asc" } }) : [],
  ]);
  const folderInput = <input type="hidden" name="folderId" value={folderId} />;
  return <>
    <header className="topbar"><Link href="/dashboard">Workspace</Link> <span>/</span> {folder.name}</header>
    <section className="workspace-content">
      <div className="section-heading heading"><div><h1 className="folder-title"><FolderIcon visibility={folder.visibility} size={26} /> {folder.name}</h1><p className="muted">{folder.visibility === "PUBLIC" ? "Public folder" : "Private folder"}</p></div>
        {isOwner && <form action={createBlankDocumentAction}><button className="button secondary">Add document</button></form>}
      </div>
      <DocumentList {...result} query={query} page={page} base={"/folders/" + folderId} />
      {isOwner && <details className="panel settings"><summary>Folder settings</summary>
        <WorkspaceForm operation="visibility">{folderInput}<label>Visibility<select name="visibility" defaultValue={folder.visibility}><option value="PRIVATE">Private</option><option value="PUBLIC">Public</option></select></label><button className="button secondary">Save visibility</button></WorkspaceForm>
        {folder.visibility === "PUBLIC" && <Link href={"/f/" + folderId}>Open public folder</Link>}
        <h2>Members</h2>
        {members.length > 0 && <ul>{members.map(member => <li key={member.user.username}>{member.user.username} · {member.role.toLowerCase()}</li>)}</ul>}
        <WorkspaceForm operation="member">{folderInput}<label>Username<input name="username" required /></label><label>Access<select name="role"><option value="VIEWER">Viewer</option><option value="EDITOR">Editor</option><option value="REMOVE">Remove access</option></select></label><button className="button secondary">Update member</button></WorkspaceForm>
        <WorkspaceForm operation="delete" confirm="Delete this folder? Its documents will stay in your workspace.">{folderInput}<button className="button danger">Delete folder</button></WorkspaceForm>
      </details>}
    </section>
  </>;
}

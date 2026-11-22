import Link from "next/link";
import { DocumentList } from "@/components/document-list";
import { WorkspaceForm } from "@/components/forms";
import { requireUser } from "@/lib/session";
import { listDocuments } from "@/lib/documents";
import { parsePage } from "@/lib/api";
import { db } from "@/lib/db";

type Query = { q?: string; page?: string; new?: string; folder?: string; folderId?: string };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requireUser();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 160) : "";
  const page = parsePage(params.page);
  const [result, folders] = await Promise.all([
    listDocuments(user.id, query, page),
    params.new ? db.folder.findMany({ where: { ownerId: user.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : [],
  ]);
  return <>
    <header className="topbar">Workspace <span>/</span> All documents</header>
    <section className="workspace-content">
      <div className="heading"><h1>All documents</h1><p className="muted">Browse and search your workspace.</p></div>
      {params.new && <section className="panel">
        <div className="section-heading"><h2>New document</h2><Link href="/dashboard">Cancel</Link></div>
        <WorkspaceForm operation="document-create">
          <label>Title<input name="title" required maxLength={160} /></label>
          <label>Folder<select name="folderId" defaultValue={params.folderId ?? ""}><option value="">No folder</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>
          <button className="button primary">Create document</button>
        </WorkspaceForm>
      </section>}
      {params.folder && <section className="panel">
        <div className="section-heading"><h2>New folder</h2><Link href="/dashboard">Cancel</Link></div>
        <WorkspaceForm operation="create"><label>Folder name<input name="name" required maxLength={100} /></label><button className="button primary">Create private folder</button></WorkspaceForm>
      </section>}
      <DocumentList {...result} query={query} page={page} base="/dashboard" />
    </section>
  </>;
}

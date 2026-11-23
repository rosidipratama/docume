import Link from "next/link";
import { DocumentList } from "@/components/document-list";
import { WorkspaceForm } from "@/components/forms";
import { requireUser } from "@/app/lib/session";
import { listDocuments } from "@/app/lib/documents";
import { parsePage } from "@/app/lib/api";

type Query = { q?: string; page?: string; folder?: string; error?: string };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requireUser();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 160) : "";
  const page = parsePage(params.page);
  const result = await listDocuments(user.id, query, page);
  return <>
    <header className="topbar">Workspace <span>/</span> All documents</header>
    <section className="workspace-content">
      {params.error && <p role="alert" className="error">{params.error}</p>}
      <div className="heading"><h1>All documents</h1><p className="muted">Browse and search your workspace.</p></div>
      {params.folder && <section className="panel">
        <div className="section-heading"><h2>New folder</h2><Link href="/dashboard">Cancel</Link></div>
        <WorkspaceForm operation="create"><label>Folder name<input name="name" required maxLength={100} /></label><button className="button primary">Create private folder</button></WorkspaceForm>
      </section>}
      <DocumentList {...result} query={query} page={page} base="/dashboard" />
    </section>
  </>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownEditor } from "@/components/markdown-editor";
import { WorkspaceForm } from "@/components/forms";
import { requireUser } from "@/lib/session";
import { readDocument } from "@/lib/documents";
import { db } from "@/lib/db";

export default async function EditDocument({ params }: { params: Promise<{ systemId: string }> }) {
  const { systemId } = await params;
  const user = await requireUser();
  const doc = await readDocument(systemId, user.id, true);
  if (!doc) notFound();
  const owner = doc.ownerId === user.id;
  const [folders, shares] = await Promise.all([
    owner ? db.folder.findMany({ where: { ownerId: user.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : undefined,
    owner && !doc.folderId ? db.documentShare.findMany({
      where: { documentId: doc.id, revokedAt: null }, orderBy: { createdAt: "desc" },
      select: { id: true, type: true, expiresAt: true, recipient: { select: { username: true } } },
    }) : [],
  ]);
  const systemInput = <input type="hidden" name="systemId" value={doc.systemId} />;
  const accessPanel = owner ? <>
    <div className="panel settings">
      {doc.folderId ? <p className="muted">Access is managed in <Link href={"/folders/" + doc.folderId}>folder settings</Link>.</p> : <>
        <WorkspaceForm operation="share">{systemInput}<input type="hidden" name="type" value="USER" /><label>Share with a username<input name="username" required /></label><button className="button secondary">Grant read access</button></WorkspaceForm>
        <WorkspaceForm operation="share">{systemInput}<input type="hidden" name="type" value="PUBLIC_LINK" /><label>Public link expires in days<input name="days" type="number" min="1" max="365" defaultValue="30" required /></label><button className="button secondary">Create public link</button></WorkspaceForm>
        {shares.map(share => <WorkspaceForm key={share.id} operation="revoke">
          {systemInput}<input type="hidden" name="shareId" value={share.id} />
          <span>{share.recipient?.username ?? "Public link"}{share.expiresAt && " · Expires " + share.expiresAt.toISOString().slice(0, 10)}</span>
          <button className="button secondary">Revoke</button>
        </WorkspaceForm>)}
      </>}
    </div>
    <WorkspaceForm operation="document-delete" className="delete-document" confirm="Permanently delete this document?">{systemInput}<button className="button danger">Delete document</button></WorkspaceForm>
  </> : null;

  return <MarkdownEditor
    systemId={systemId}
    initialVersion={doc.updatedAt.toISOString()}
    createdAt={doc.createdAt.toISOString()}
    initial={{ title: doc.title, slug: doc.slug, markdown: doc.markdown, folderId: doc.folderId }}
    folders={folders}
    accessPanel={accessPanel}
  />;
}

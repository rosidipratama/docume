import { notFound } from "next/navigation";
import { Reader } from "@/components/reader";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readDocument } from "@/lib/documents";

export default async function DocumentPage({ params }: { params: Promise<{ systemId: string }> }) {
  const { systemId } = await params;
  const user = (await auth())?.user;
  const doc = await readDocument(systemId, user?.id);
  if (!doc) notFound();
  const canEdit = !!user && (user.id === doc.ownerId || !!(doc.folderId && await db.folderMember.findFirst({
    where: { folderId: doc.folderId, userId: user.id, role: "EDITOR" }, select: { id: true },
  })));
  return <Reader signedIn={!!user} canEdit={canEdit} systemId={systemId} downloadHref={"/api/docs/" + systemId + "/download"}>
    <p className="document-id">{systemId}</p><h1>{doc.title}</h1><MarkdownViewer markdown={doc.markdown} />
  </Reader>;
}

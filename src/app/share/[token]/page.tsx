import { notFound } from "next/navigation";
import { Reader } from "@/components/reader";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { db } from "@/lib/db";
import { tokenHash } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SharedDocument({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  const share = await db.documentShare.findFirst({
    where: { tokenHash: tokenHash(token), type: "PUBLIC_LINK", revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], document: { folderId: null } },
    select: { document: { select: { title: true, systemId: true, markdown: true } } },
  });
  if (!share) notFound();
  return <Reader><p className="document-id">{share.document.systemId}</p>
    <h1>{share.document.title}</h1><MarkdownViewer markdown={share.document.markdown} />
  </Reader>;
}

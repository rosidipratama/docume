import { auth } from "@/lib/auth";
import { readDocument } from "@/lib/documents";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ systemId: string }> }) {
  const { systemId } = await params;
  const user = (await auth())?.user;
  const doc = await readDocument(systemId, user?.id);
  if (!doc) {
    return new Response("Document not found.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const name = (doc.slug || doc.systemId)
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "document";
  const asciiName = name.replace(/[^\x20-\x7E]/g, "-").replace(/["\\]/g, "") || "document";
  const encodedName = encodeURIComponent(`${name}.md`);

  return new Response(doc.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiName}.md"; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import { documentApi, readJson } from "@/lib/api";
import { readDocument, updateDocument, deleteDocument, DomainError } from "@/lib/documents";

type Context = { params: Promise<{ systemId: string }> };

export function GET(request: Request, context: Context) {
  return documentApi(async (userId) => {
    const document = await readDocument((await context.params).systemId, userId);
    if (!document) throw new DomainError(404, "Document not found.");
    return document;
  });
}

export function PATCH(request: Request, context: Context) {
  return documentApi(async (userId) => updateDocument(userId, (await context.params).systemId, await readJson(request), request.headers.get("X-Document-Version") ?? undefined));
}

export function DELETE(request: Request, context: Context) {
  return documentApi(async (userId) => deleteDocument(userId, (await context.params).systemId), 204);
}

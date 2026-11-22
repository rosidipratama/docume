import { documentApi, parsePage, readJson } from "@/lib/api";
import { createDocument, listDocuments } from "@/lib/documents";

export function GET(request: Request) {
  const url = new URL(request.url);
  return documentApi((userId) => listDocuments(userId, (url.searchParams.get("q") ?? "").trim().slice(0, 160), parsePage(url.searchParams.get("page")), undefined, true));
}

export function POST(request: Request) {
  return documentApi(async (userId) => createDocument(userId, await readJson(request)), 201);
}

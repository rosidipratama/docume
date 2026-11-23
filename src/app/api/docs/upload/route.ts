import { documentApi } from "@/lib/api";
import { DomainError, importDocuments } from "@/lib/documents";

export async function POST(request: Request) {
  return documentApi(async (userId) => {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
      throw new DomainError(422, "Send files as multipart/form-data.");
    }
    const form = await request.formData();
    const files = form.getAll("files").filter((entry): entry is File => typeof entry !== "string");
    return importDocuments(userId, files);
  }, 201);
}

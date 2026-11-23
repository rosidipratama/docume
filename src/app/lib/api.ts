import { auth } from "./auth";
import { DomainError, errorMessage } from "./documents";

export async function documentApi(action: (userId: string) => Promise<unknown>, status = 200) {
  try {
    const session = await auth();
    if (!session?.user.id) throw new DomainError(401, "Sign in to access the document API.");
    const result = await action(session.user.id);
    const headers = { "Cache-Control": "private, no-store" };
    return status === 204 ? new Response(null, { status, headers }) : Response.json(result, { status, headers });
  } catch (error) {
    const { status, message } = errorMessage(error);
    return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
}

export function parsePage(value: string | null | undefined) {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1;
}

export function readJson(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new DomainError(422, "Send the request as application/json.");
  }
  return request.json() as Promise<unknown>;
}

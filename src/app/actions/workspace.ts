"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { createDocument, deleteDocument, DomainError, errorMessage } from "@/app/lib/documents";
import { folderAction, shareDocument } from "@/app/lib/workspace";
import type { ActionState } from "@/app/lib/action-state";

export async function workspaceAction(operation: string, _: ActionState, form: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  const userId = session.user.id;
  const data = Object.fromEntries(form.entries());
  let destination: string | undefined;
  let state: ActionState = { message: "Changes saved." };
  try {
    if (operation === "document-create") {
      const doc = await createDocument(userId, { title: data.title, folderId: data.folderId || null });
      destination = "/docs/" + doc.systemId + "/edit";
    } else if (operation === "document-delete") {
      await deleteDocument(userId, String(data.systemId));
      destination = "/dashboard";
    } else if (operation === "share") {
      const result = await shareDocument(userId, String(data.systemId), data);
      state = result.token ? { token: result.token } : { message: "Read access granted." };
    } else if (operation === "revoke") {
      const result = await db.documentShare.updateMany({
        where: { id: String(data.shareId), document: { ownerId: userId, systemId: String(data.systemId) } },
        data: { revokedAt: new Date() },
      });
      if (!result.count) throw new DomainError(404, "Share not found.");
      state = { message: "Access revoked." };
    } else {
      const result = await folderAction(userId, operation, data);
      if (operation === "create" && "id" in result) destination = "/folders/" + result.id;
      if (operation === "delete") destination = "/dashboard";
    }
  } catch (error) { return { error: errorMessage(error).message }; }
  revalidatePath("/", "layout");
  if (destination) redirect(destination);
  return state;
}

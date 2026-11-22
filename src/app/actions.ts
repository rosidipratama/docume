"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth, signIn, signOut, username } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createDocument, deleteDocument, DomainError, errorMessage } from "@/lib/documents";
import { folderAction, shareDocument } from "@/lib/workspace";

export type ActionState = { error?: string; message?: string; token?: string };

export async function authenticate(mode: "login" | "signup", _: ActionState, form: FormData): Promise<ActionState> {
  const result = z.object({
    username, password: z.string().min(mode === "signup" ? 10 : 1).max(128),
  }).safeParse({ username: form.get("username"), password: form.get("password") });
  if (!result.success) return { error: mode === "signup"
    ? "Use 2–30 letters, numbers, underscores or hyphens for your username and at least 10 characters for your password."
    : "Enter your username and password." };
  const { username: handle, password } = result.data;
  if (mode === "signup") {
    try {
      await db.user.create({ data: { username: handle, passwordHash: await hashPassword(password) } });
    } catch (error) { return { error: errorMessage(error).message }; }
  }
  try {
    await signIn("credentials", { username: handle, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return { error: error.type === "CredentialsSignin" ? "The username or password is incorrect." : "Sign-in is currently unavailable." };
    throw error;
  }
  return {};
}

export async function logout() { await signOut({ redirectTo: "/" }); }

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

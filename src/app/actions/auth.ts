"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { hashPassword } from "@/app/lib/password";
import { errorMessage } from "@/app/lib/documents";
import { credentialsSchema } from "@/app/lib/auth-schema";
import type { ActionState } from "@/app/lib/action-state";

export async function authenticate(mode: "login" | "signup", _: ActionState, form: FormData): Promise<ActionState> {
  const result = credentialsSchema(mode).safeParse({
    username: form.get("username"), password: form.get("password"),
  });
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

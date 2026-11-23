"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/app/lib/auth";
import { createBlankDocument, errorMessage } from "@/app/lib/documents";

export async function createBlankDocumentAction(_form: FormData) {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  let systemId: string;
  try {
    const doc = await createBlankDocument(session.user.id);
    systemId = doc.systemId;
  } catch (error) {
    redirect("/dashboard?error=" + encodeURIComponent(errorMessage(error).message));
  }
  revalidatePath("/", "layout");
  redirect("/docs/" + systemId + "/edit");
}

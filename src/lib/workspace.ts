import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { DomainError, lockDocument, slugFor } from "./documents";
import { username } from "./auth";

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function shareDocument(userId: string, systemId: string, input: unknown) {
  const data = z.discriminatedUnion("type", [
    z.object({ type: z.literal("USER"), username }),
    z.object({ type: z.literal("PUBLIC_LINK"), days: z.coerce.number().int().min(1).max(365) }),
  ]).parse(input);
  return db.$transaction(async (tx) => {
    await lockDocument(tx, systemId);
    const doc = await tx.document.findFirst({ where: { ownerId: userId, systemId } });
    if (!doc) throw new DomainError(404, "Document not found.");
    if (doc.folderId) throw new DomainError(422, "Documents in folders use the folder’s access settings.");
    if (data.type === "USER") {
      const recipient = await tx.user.findUnique({ where: { username: data.username }, select: { id: true } });
      if (!recipient || recipient.id === userId) throw new DomainError(422, "Choose another existing account.");
      await tx.documentShare.upsert({
        where: { documentId_recipientUserId: { documentId: doc.id, recipientUserId: recipient.id } },
        create: { documentId: doc.id, createdById: userId, type: "USER", recipientUserId: recipient.id },
        update: { revokedAt: null, expiresAt: null },
      });
      return {};
    }
    const token = randomBytes(32).toString("base64url");
    await tx.documentShare.create({ data: {
      documentId: doc.id, createdById: userId, type: "PUBLIC_LINK", tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + data.days * 86_400_000),
    } });
    return { token };
  });
}

export async function folderAction(userId: string, operation: string, input: unknown) {
  const data = z.object({
    folderId: z.string().optional(), name: z.string().trim().min(1).max(100).optional(),
    visibility: z.enum(["PRIVATE", "PUBLIC"]).optional(), username: username.optional(),
    role: z.enum(["VIEWER", "EDITOR", "REMOVE"]).optional(),
  }).parse(input);
  if (operation === "create" && data.name) {
    const slug = slugFor(data.name);
    if (!slug) throw new DomainError(422, "Use at least one letter or number.");
    return db.folder.create({ data: { ownerId: userId, name: data.name, slug } });
  }
  if (!data.folderId) throw new DomainError(422, "Choose a folder.");
  const where = { id: data.folderId, ownerId: userId };
  if (operation === "visibility" && data.visibility) {
    return db.folder.update({ where, data: { visibility: data.visibility } });
  }
  if (operation === "delete") return db.folder.delete({ where });
  if (operation === "member" && data.username && data.role) {
    const role = data.role;
    return db.$transaction(async (tx) => {
      const folder = await tx.folder.findUnique({ where, select: { id: true } });
      if (!folder) throw new DomainError(404, "Folder not found.");
      const member = await tx.user.findUnique({ where: { username: data.username }, select: { id: true } });
      if (!member || member.id === userId) throw new DomainError(422, "Choose another existing account.");
      const key = { folderId: folder.id, userId: member.id };
      if (role === "REMOVE") return tx.folderMember.deleteMany({ where: key });
      return tx.folderMember.upsert({
        where: { folderId_userId: key }, create: { ...key, role }, update: { role },
      });
    });
  }
  throw new DomainError(422, "Check the supplied folder settings.");
}

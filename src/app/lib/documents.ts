import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { db } from "./db";

export class DomainError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function slugFor(title: string) {
  return title.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 100).replace(/-$/, "");
}

const fields = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(100).regex(/^[\p{Ll}\p{Lo}\p{N}]+(?:-[\p{Ll}\p{Lo}\p{N}]+)*$/u).optional(),
  markdown: z.string().max(500_000).optional(),
  folderId: z.string().min(1).max(100).nullable().optional(),
}).strict();

export const metadata = {
  systemId: true, title: true, slug: true, folderId: true, ownerId: true, createdAt: true, updatedAt: true,
} satisfies Prisma.DocumentSelect;

export function folderAccess(userId?: string): Prisma.FolderWhereInput {
  return { OR: [
    { visibility: "PUBLIC" },
    ...(userId ? [{ ownerId: userId }, { members: { some: { userId } } }] : []),
  ] };
}

export function docAccess(userId?: string): Prisma.DocumentWhereInput {
  return { OR: [
    { folder: { is: folderAccess(userId) } },
    ...(userId ? [{ ownerId: userId }, {
      folderId: null,
      shares: { some: { recipientUserId: userId, type: "USER" as const, revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
    }] : []),
  ] };
}

function editAccess(userId: string): Prisma.DocumentWhereInput {
  return { OR: [{ ownerId: userId }, { folder: { members: { some: { userId, role: "EDITOR" } } } }] };
}

export function readDocument(systemId: string, userId?: string, edit = false) {
  return db.document.findFirst({ where: {
    systemId, ...(edit && userId ? editAccess(userId) : docAccess(userId)),
  } });
}

export function literalSearch(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function listDocuments(userId: string, query = "", page = 1, folderId?: string, includePublic = false) {
  const where: Prisma.DocumentWhereInput = {
    AND: [docAccess(userId), folderId ? { folderId } : query || includePublic ? {} : {
      OR: [{ ownerId: userId }, { folder: { members: { some: { userId } } } }, {
        folderId: null, shares: { some: { recipientUserId: userId, revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
      }],
    }],
  };
  if (query) {
    for (const key of ["systemId", "slug", "title"] as const) {
      const exact = { ...where, [key]: key === "title" ? { equals: literalSearch(query), mode: "insensitive" } : query.toLowerCase() };
      if (await db.document.findFirst({ where: exact, select: { id: true } })) return pageOf(exact, page);
    }
    where.title = { contains: literalSearch(query), mode: "insensitive" };
  }
  return pageOf(where, page);
}

async function pageOf(where: Prisma.DocumentWhereInput, page: number) {
  const documents = await db.document.findMany({
    where, select: metadata, orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * 20, take: 21,
  });
  return { documents: documents.slice(0, 20), nextPage: documents.length > 20 ? page + 1 : null };
}

async function checkFolder(tx: Prisma.TransactionClient, folderId: string | null | undefined, ownerId: string) {
  if (folderId && !await tx.folder.findFirst({ where: { id: folderId, ownerId }, select: { id: true } })) {
    throw new DomainError(422, "Choose a folder you own.");
  }
}

async function checkTitle(tx: Prisma.TransactionClient, ownerId: string, title: string, systemId?: string) {
  if (await tx.document.findFirst({ where: { ownerId, title: { equals: literalSearch(title), mode: "insensitive" }, systemId: { not: systemId } }, select: { id: true } })) {
    throw new DomainError(409, "A document already uses this title.");
  }
}

export async function createDocument(userId: string, input: unknown) {
  const { title, folderId, markdown, slug } = fields.parse(input);
  return db.$transaction(async (tx) => {
    const [user] = await tx.$queryRaw<{ username: string; docCounter: number }[]>`
      UPDATE "User" SET "docCounter" = "docCounter" + 1
      WHERE "id" = ${userId} AND "docCounter" < 99999
      RETURNING "username", "docCounter"
    `;
    if (!user) throw new DomainError(422, "The account has reached its document ID limit.");
    await checkFolder(tx, folderId, userId);
    await checkTitle(tx, userId, title);
    const systemId = user.username + "-" + String(user.docCounter).padStart(5, "0");
    return tx.document.create({ data: {
      ownerId: userId, systemId, sequence: user.docCounter, title, slug: slug ?? (slugFor(title) || systemId),
      folderId, markdown,
    } });
  });
}

/** Creates a unique, unconfigured draft without requiring a title or folder. */
export async function createBlankDocument(userId: string) {
  return db.$transaction(async (tx) => {
    const [user] = await tx.$queryRaw<{ username: string; docCounter: number }[]>`
      UPDATE "User" SET "docCounter" = "docCounter" + 1
      WHERE "id" = ${userId} AND "docCounter" < 99999
      RETURNING "username", "docCounter"
    `;
    if (!user) throw new DomainError(422, "The account has reached its document ID limit.");
    const sequence = user.docCounter;
    const systemId = user.username + "-" + String(sequence).padStart(5, "0");
    const title = `Untitled ${sequence} — ${systemId}`;
    return tx.document.create({ data: {
      ownerId: userId, systemId, sequence, title,
      slug: slugFor(title) || systemId,
      folderId: null, markdown: "",
    } });
  });
}

/** Imported files always land in No folder with no shares, so they stay private. */
export async function importDocuments(userId: string, files: { name: string; size: number; text: () => Promise<string> }[]) {
  if (!files.length) throw new DomainError(422, "Choose at least one file to upload.");
  if (files.length > 10) throw new DomainError(422, "Upload up to 10 files at a time.");
  const extension = /\.(md|markdown|mdown|mkd|txt)$/i;
  const prepared = await Promise.all(files.map(async file => {
    const name = file.name.split(/[\\/]/).pop() ?? file.name;
    if (!extension.test(name)) throw new DomainError(422, `${name} is not a Markdown or text file.`);
    if (file.size > 2_000_000) throw new DomainError(422, `${name} is larger than the 2 MB upload limit.`);
    const title = name.replace(extension, "").trim().slice(0, 160) || "Imported document";
    const markdown = (await file.text()).replace(/^\uFEFF/, "").slice(0, 500_000);
    return { title, markdown };
  }));

  return db.$transaction(async (tx) => {
    const created: { systemId: string; title: string; folderId: string | null }[] = [];
    for (const item of prepared) {
      const [user] = await tx.$queryRaw<{ username: string; docCounter: number }[]>`
        UPDATE "User" SET "docCounter" = "docCounter" + 1
        WHERE "id" = ${userId} AND "docCounter" < 99999
        RETURNING "username", "docCounter"
      `;
      if (!user) throw new DomainError(422, "The account has reached its document ID limit.");
      const sequence = user.docCounter;
      const systemId = user.username + "-" + String(sequence).padStart(5, "0");
      let title = item.title;
      let titleSuffix = 2;
      while (await tx.document.findFirst({ where: { ownerId: userId, title: { equals: title, mode: "insensitive" } }, select: { id: true } })) {
        const suffix = ` (${titleSuffix++})`;
        title = item.title.slice(0, 160 - suffix.length) + suffix;
      }
      let slug = slugFor(title) || systemId;
      let slugSuffix = 2;
      while (await tx.document.findFirst({ where: { ownerId: userId, slug }, select: { id: true } })) {
        const suffix = "-" + slugSuffix++;
        slug = slug.slice(0, 100 - suffix.length) + suffix;
      }
      const document = await tx.document.create({ data: {
        ownerId: userId, systemId, sequence, title, slug, markdown: item.markdown, folderId: null,
      } });
      created.push({ systemId: document.systemId, title: document.title, folderId: document.folderId });
    }
    return created;
  }, { timeout: 30_000 });
}

export async function lockDocument(tx: Prisma.TransactionClient, systemId: string) {
  await tx.$queryRaw`SELECT id FROM "Document" WHERE "systemId" = ${systemId} FOR UPDATE`;
}

export async function updateDocument(userId: string, systemId: string, input: unknown, expectedVersion?: string) {
  const patch = fields.partial().parse(input);
  if (!Object.keys(patch).length) throw new DomainError(422, "Send at least one field.");
  return db.$transaction(async (tx) => {
    const current = await tx.document.findFirst({ where: { systemId, ...docAccess(userId) }, select: { id: true, ownerId: true } });
    if (!current) throw new DomainError(404, "Document not found.");
    if (patch.title) await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${current.ownerId} FOR UPDATE`;
    await lockDocument(tx, systemId);
    const editable = await tx.document.findFirst({ where: { systemId, ...editAccess(userId) }, select: { updatedAt: true } });
    if (!editable) {
      throw new DomainError(403, "This document is read-only.");
    }
    if (expectedVersion && editable.updatedAt.toISOString() !== expectedVersion) {
      throw new DomainError(409, "This document changed in another session. Copy your unsaved changes before reloading.");
    }
    if (patch.folderId !== undefined && current.ownerId !== userId) throw new DomainError(403, "Only the owner can move this document.");
    await checkFolder(tx, patch.folderId, current.ownerId);
    if (patch.title) await checkTitle(tx, current.ownerId, patch.title, systemId);
    if (patch.folderId) await tx.documentShare.deleteMany({ where: { documentId: current.id } });
    const updatedAt = new Date(Math.max(Date.now(), editable.updatedAt.getTime() + 1));
    const updated = await tx.document.updateMany({ where: { systemId, ...editAccess(userId) }, data: { ...patch, updatedAt } });
    if (!updated.count) throw new DomainError(403, "This document is read-only.");
    return tx.document.findUniqueOrThrow({ where: { systemId } });
  });
}

export async function deleteDocument(userId: string, systemId: string) {
  const deleted = await db.document.deleteMany({ where: { ownerId: userId, systemId } });
  if (deleted.count) return;
  if (await readDocument(systemId, userId)) throw new DomainError(403, "Only the owner can delete this document.");
  throw new DomainError(404, "Document not found.");
}

export function errorMessage(error: unknown) {
  if (error instanceof DomainError) return { status: error.status, message: error.message };
  if (error instanceof z.ZodError || error instanceof SyntaxError) return { status: 422, message: "Check the supplied fields and try again." };
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { status: 409, message: "That name, username, or slug is already in use." };
    if (error.code === "P2025") return { status: 404, message: "The requested item no longer exists." };
    if (error.code === "P2003") return { status: 409, message: "A related record changed. Please try again." };
  }
  return { status: 500, message: "Something went wrong. Please try again." };
}

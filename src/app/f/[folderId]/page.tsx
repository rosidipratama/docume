import { notFound } from "next/navigation";
import { Reader } from "@/components/reader";
import { DocumentList } from "@/components/document-list";
import { FolderIcon } from "@/components/folder-icon";
import { db } from "@/lib/db";
import { literalSearch, metadata } from "@/lib/documents";
import { parsePage } from "@/lib/api";

export default async function PublicFolder({ params, searchParams }: {
  params: Promise<{ folderId: string }>; searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { folderId } = await params;
  const { q, page: rawPage } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 160) : "";
  const page = parsePage(rawPage);
  const folder = await db.folder.findFirst({
    where: { id: folderId, visibility: "PUBLIC" },
    select: { name: true, documents: {
      where: query ? { title: { contains: literalSearch(query), mode: "insensitive" } } : {},
      select: metadata, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], skip: (page - 1) * 20, take: 21,
    } },
  });
  if (!folder) notFound();
  return <Reader><h1 className="folder-title"><FolderIcon visibility="PUBLIC" size={32} /> {folder.name}</h1><p className="muted">Public folder</p>
    <DocumentList documents={folder.documents.slice(0, 20)} query={query} page={page} nextPage={folder.documents.length > 20 ? page + 1 : null} base={"/f/" + folderId} />
  </Reader>;
}

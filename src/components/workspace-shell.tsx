"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LogOut, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { Brand } from "@/components/brand";
import { DocumentDropzone } from "@/components/document-dropzone";
import { FolderIcon } from "@/components/folder-icon";
import { createBlankDocumentAction, logout } from "@/app/actions";

const STORAGE_KEY = "docume:sidebar-rail";

type Folder = { id: string; name: string; visibility: "PRIVATE" | "PUBLIC" };

export function WorkspaceShell({ children, userName, folders }: {
  children: React.ReactNode;
  userName?: string | null;
  folders: Folder[];
}) {
  const pathname = usePathname() ?? "";
  const onEditor = /^\/docs\/[^/]+\/edit(?:\/|$)/.test(pathname);
  const [rail, setRail] = useState(onEditor);

  useEffect(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(STORAGE_KEY); } catch { /* storage may be unavailable */ }
    setRail(stored === "rail" || stored === "expanded" ? stored === "rail" : onEditor);
  }, [onEditor]);

  function toggleRail() {
    setRail(current => {
      const next = !current;
      try { window.localStorage.setItem(STORAGE_KEY, next ? "rail" : "expanded"); } catch { /* storage may be unavailable */ }
      return next;
    });
  }

  return <div className={"workspace" + (rail ? " is-rail" : "")}>
    <aside className="sidebar" id="docume-sidebar" aria-label="Workspace sidebar">
      <div className="sidebar-top">
        <Brand href="/dashboard" compact={rail} />
        <button
          type="button"
          className="icon-button sidebar-toggle"
          onClick={toggleRail}
          aria-controls="docume-sidebar"
          aria-expanded={!rail}
          aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
          title={rail ? "Expand sidebar" : "Collapse sidebar"}
        >
          {rail ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      <div className="sidebar-actions">
        <form action={createBlankDocumentAction}>
          <button className="button primary sidebar-action new-document-button" aria-label="New document" title={rail ? "New document" : undefined}>
            <Plus size={17} /> <span className="nav-label">New document</span>
          </button>
        </form>
        <DocumentDropzone compact={rail} />
      </div>
      <p className="upload-hint muted">Or drag and drop .md files anywhere.</p>

      <nav aria-label="Workspace">
        <Link className="nav-row" href="/dashboard" aria-label="All documents" title={rail ? "All documents" : undefined}>
          <LayoutGrid size={17} /> <span className="nav-label">All documents</span>
        </Link>
        <div className="nav-heading">
          <span className="nav-label">Folders</span>
          <Link href="/dashboard?folder=1" aria-label="New folder" title="New folder"><Plus size={16} /></Link>
        </div>
        {folders.map(folder => <Link
          className="nav-row"
          key={folder.id}
          href={"/folders/" + folder.id}
          aria-label={"Folder: " + folder.name}
          title={rail ? folder.name : undefined}
        >
          <FolderIcon visibility={folder.visibility} size={17} /> <span className="nav-label">{folder.name}</span>
        </Link>)}
      </nav>

      <div className="sidebar-account">
        <div className="avatar" title={userName ?? undefined}>{userName?.[0]?.toUpperCase() ?? "D"}</div>
        <span className="nav-label">{userName}</span>
        <form action={logout}>
          <button className="icon-button" aria-label="Sign out" title={rail ? "Sign out" : undefined}><LogOut size={17} /></button>
        </form>
      </div>
    </aside>
    <main className="workspace-main">{children}</main>
  </div>;
}

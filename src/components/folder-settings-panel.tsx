"use client";

import { useState, type ReactNode } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

export function FolderSettingsPanel({ folderName, settings, children }: {
  folderName: string;
  settings: ReactNode | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  if (!settings) return <div className="folder-view">{children}</div>;

  return <>
    <div className={"folder-view" + (open ? "" : " settings-collapsed")}>
      <div className="folder-view-main">{children}</div>
      {open ? <aside className="folder-settings" aria-label="Folder settings">
        <div className="folder-settings-head">
          <div className="folder-settings-heading">
            <span>Folder settings</span>
            <strong>{folderName}</strong>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-expanded="true"
            aria-label="Collapse folder settings"
            title="Collapse folder settings"
            onClick={() => setOpen(false)}
          >
            <PanelRightClose size={17} />
          </button>
        </div>
        <div className="folder-settings-body settings">{settings}</div>
      </aside> : <aside className="folder-settings-collapsed" aria-label="Folder settings collapsed">
        <button
          type="button"
          className="icon-button"
          aria-expanded="false"
          aria-label="Expand folder settings"
          title="Expand folder settings"
          onClick={() => setOpen(true)}
        >
          <PanelRightOpen size={17} />
        </button>
      </aside>}
    </div>
    {open && <button
      type="button"
      className="folder-settings-backdrop"
      aria-label="Close folder settings"
      onClick={() => setOpen(false)}
    />}
  </>;
}

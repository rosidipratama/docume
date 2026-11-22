import { Folder, FolderLock, UsersRound } from "lucide-react";

type FolderIconProps = {
  visibility: "PRIVATE" | "PUBLIC";
  size?: number;
  className?: string;
};

/** Private folders use a locked folder; shared/public folders use a folder with a two-person badge. */
export function FolderIcon({ visibility, size = 17, className = "" }: FolderIconProps) {
  const shared = visibility === "PUBLIC";

  if (!shared) {
    return <FolderLock size={size} className={className} aria-hidden="true" />;
  }

  const badgeSize = Math.min(16, Math.max(9, Math.round(size * 0.58)));
  return (
    <span className={`folder-icon${className ? ` ${className}` : ""}`} style={{ width: size, height: size }} aria-hidden="true">
      <Folder size={size} />
      <UsersRound size={badgeSize} className="folder-icon__badge" />
    </span>
  );
}

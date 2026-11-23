import Link from "next/link";
import { BookOpen } from "lucide-react";

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return <Link
    href={href}
    className={"brand" + (compact ? " brand-compact" : "")}
    aria-label="DocuMe"
    title={compact ? "DocuMe" : undefined}
  >
    <span className="brand-mark"><BookOpen size={18} /></span>
    <span className="brand-name">DocuMe</span>
  </Link>;
}

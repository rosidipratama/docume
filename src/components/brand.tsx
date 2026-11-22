import Link from "next/link";
import { BookOpen } from "lucide-react";

export function Brand({ href = "/" }: { href?: string }) {
  return <Link href={href} className="brand"><span className="brand-mark"><BookOpen size={18} /></span>DocuMe</Link>;
}

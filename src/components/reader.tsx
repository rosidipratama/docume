import Link from "next/link";
import { Download } from "lucide-react";
import { Brand } from "@/components/brand";

export function Reader({ children, canEdit, systemId, signedIn, downloadHref }: {
  children: React.ReactNode; canEdit?: boolean; systemId?: string; signedIn?: boolean; downloadHref?: string;
}) {
  return <main className="reader">
    <header className="landing-nav"><Brand href={signedIn ? "/dashboard" : "/"} /><nav>
      {signedIn && <Link className="button secondary" href="/dashboard">Workspace</Link>}
      {downloadHref && <a className={"button " + (canEdit ? "secondary" : "primary")} href={downloadHref} download>
        <Download size={16} /> Download .md
      </a>}
      {canEdit && <Link className="button primary" href={"/docs/" + systemId + "/edit"}>Edit document</Link>}
    </nav></header>
    <article className="reader-content">{children}</article>
  </main>;
}

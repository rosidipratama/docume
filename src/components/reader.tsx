import Link from "next/link";
import { Brand } from "@/components/brand";

export function Reader({ children, canEdit, systemId, signedIn }: {
  children: React.ReactNode; canEdit?: boolean; systemId?: string; signedIn?: boolean;
}) {
  return <main className="reader">
    <header className="landing-nav"><Brand href={signedIn ? "/dashboard" : "/"} /><nav>
      {signedIn && <Link className="button secondary" href="/dashboard">Workspace</Link>}
      {canEdit && <Link className="button primary" href={"/docs/" + systemId + "/edit"}>Edit document</Link>}
    </nav></header>
    <article className="reader-content">{children}</article>
  </main>;
}

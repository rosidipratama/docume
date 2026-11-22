import Link from "next/link";
import { FileText, LayoutGrid, Plus, Search } from "lucide-react";
import { Brand } from "@/components/brand";
import { FolderIcon } from "@/components/folder-icon";

export default function Home() {
  return <main className="landing">
    <header className="landing-nav"><Brand /><nav><Link className="button secondary" href="/login">Sign in</Link><Link className="button primary" href="/signup">Create account</Link></nav></header>
    <section className="hero">
      <h1>A home for your<br /><em>Markdown documents.</em></h1>
      <p>Write in Markdown, keep related work together, and share documents with the people who need them.</p>
      <Link className="button primary" href="/signup">Create your workspace</Link>
    </section>
    <section className="workspace-preview" aria-label="Example DocuMe workspace">
      <aside><Brand /><div className="preview-new"><Plus size={16} /> New document</div><div className="preview-nav active"><LayoutGrid size={16} /> All documents</div><p>Folders</p><div className="preview-nav"><FolderIcon visibility="PRIVATE" size={16} /> Product</div><div className="preview-nav"><FolderIcon visibility="PUBLIC" size={16} /> Team notes</div></aside>
      <div className="preview-content"><div className="preview-bar">Workspace <span>/</span> All documents</div><div className="preview-body"><h2>All documents</h2><div className="preview-search"><Search size={16} /> Search documents</div>
        {["Project brief", "Design notes", "Team handbook"].map((name, i) => <div className="preview-row" key={name}><FileText size={19} /><div><strong>{name}</strong><small>{i === 2 ? "Team notes" : "Product"}</small></div></div>)}
      </div></div>
    </section>
  </main>;
}

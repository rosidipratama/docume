import Link from "next/link";
import { FileText, Search } from "lucide-react";

type Entry = { systemId: string; title: string; updatedAt: Date; slug: string };
const formatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function DocumentList({ documents, query, page, nextPage, base }: { documents: Entry[]; query: string; page: number; nextPage: number | null; base: string }) {
  const pageLink = (number: number) => base + "?" + new URLSearchParams({ q: query, page: String(number) });
  return <>
    <form action={base} className="search"><Search size={17} /><input aria-label="Search documents" name="q" defaultValue={query} placeholder="Search documents" maxLength={160} /><button className="button secondary">Search</button></form>
    <div className="documents">
      <div className="table-head"><span>Document</span><span>Updated</span></div>
      {documents.length ? documents.map(doc => <Link className="document-row" key={doc.systemId} href={"/d/" + doc.systemId}>
        <span className="file-icon"><FileText size={19} /></span>
        <span><strong>{doc.title}</strong><small>{doc.systemId}</small></span>
        <time dateTime={doc.updatedAt.toISOString()}>{formatter.format(doc.updatedAt)}</time>
      </Link>) : <div className="empty"><FileText size={25} /><p>{query ? "No documents match your search." : "No documents here yet."}</p></div>}
    </div>
    {(page > 1 || nextPage) && <nav className="pagination" aria-label="Document pages">
      {page > 1 && <Link href={pageLink(page - 1)}>Previous</Link>}
      <span>Page {page}</span>
      {nextPage && <Link href={pageLink(nextPage)}>Next</Link>}
    </nav>}
  </>;
}

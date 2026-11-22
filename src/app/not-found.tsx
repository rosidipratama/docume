import Link from "next/link";
import { Reader } from "@/components/reader";

export default function NotFound() {
  return <Reader><h1>Page unavailable</h1><p className="muted">Check the link or sign in with an account that has access.</p><p className="mt-5"><Link className="button secondary" href="/login">Sign in</Link></p></Reader>;
}

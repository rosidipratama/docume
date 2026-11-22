import Link from "next/link";
import { AccountForm } from "@/components/forms";

export default function Signup() {
  return <><h1>Create your account</h1><p className="muted">Your username becomes the prefix for your document IDs.</p><AccountForm mode="signup" /><p className="muted">Already have an account? <Link href="/login">Sign in</Link></p></>;
}

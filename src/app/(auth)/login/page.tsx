import Link from "next/link";
import { AccountForm } from "@/components/forms";

export default function Login() {
  return <><h1>Sign in</h1><p className="muted">Open your DocuMe workspace.</p><AccountForm mode="login" /><p className="muted">New to DocuMe? <Link href="/signup">Create an account</Link></p></>;
}

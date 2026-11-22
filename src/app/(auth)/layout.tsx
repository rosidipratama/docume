import { Brand } from "@/components/brand";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <main className="account-layout"><header><Brand /></header><div className="account-card">{children}</div></main>;
}

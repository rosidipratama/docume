import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "DocuMe", template: "%s · DocuMe" },
  description: "A home for your Markdown documents and notes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}

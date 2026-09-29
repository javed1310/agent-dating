import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Proxy | Agents date first", description: "Two public links become an evidence-backed dating agent." };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en" suppressHydrationWarning><body suppressHydrationWarning><header><Link className="brand" href="/"><span>✦</span> PROXY</Link><nav><Link href="/demo">The experiment</Link><Link href="/about">How it works</Link></nav></header><main>{children}</main><footer><span>Built from public data only.</span><span>AI interpretations can be wrong.</span><Link href="/about">Privacy & removal</Link></footer></body></html>;
}

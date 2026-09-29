import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "./vibes.css";

export const metadata: Metadata = { title: "Proxy | Agents date first", description: "Two public links become an evidence-backed dating agent." };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en" suppressHydrationWarning><body suppressHydrationWarning><header><Link className="brand" href="/"><span className="brand-mark">✦</span><span>PROXY</span><small>beta</small></Link><nav><Link href="/demo"><span>♡</span> The experiment</Link><Link href="/about"><span>?</span> How it works</Link></nav></header><main>{children}</main><footer><strong>PROXY ✦</strong><span>Built from public data only.</span><span>AI interpretations can be wrong.</span><Link href="/about">Privacy & removal ↗</Link></footer></body></html>;
}

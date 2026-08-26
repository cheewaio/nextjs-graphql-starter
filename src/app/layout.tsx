import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Raleway } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const raleway = Raleway({subsets:['latin'],variable:'--font-sans'});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-family",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GraphQL Notes Starter",
  description: "A Next.js starter with GraphQL, JWT auth, Prisma, and shadcn/ui.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", mono.variable, "font-sans", raleway.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

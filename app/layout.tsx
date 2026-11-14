import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinFam AI - Gestão Financeira Familiar",
  description: "Controle financeiro inteligente, orçamentos, metas e investimentos da família.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WillBank - Gestão Financeira Familiar",
  description: "WillBank: Controle financeiro inteligente, endividamento, orçamentos, metas e investimentos da família.",
  icons: {
    icon: "/willbank-logo.jpg",
    shortcut: "/willbank-logo.jpg",
    apple: "/willbank-logo.jpg",
  },
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

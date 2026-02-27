import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VoteLive — Sondaggi in tempo reale',
  description: 'Crea sondaggi personalizzati e vota in tempo reale',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Marianna.exe',
  description: 'A romantic tech-style experience for Marianna Haddad.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`}
    >
      <body className="matrix-bg">
        <div className="matrix-rain layer-one" aria-hidden="true" />
        <div className="matrix-rain layer-two" aria-hidden="true" />
        <div className="matrix-overlay" aria-hidden="true" />
        <div className="matrix-overlay soft" aria-hidden="true" />
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}

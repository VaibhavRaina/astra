import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Jewelry Studio - Virtual Try-On Experience',
  description: 'Advanced AI-powered virtual jewelry try-on with realistic sizing and placement. Upload jewelry and model photos for instant professional results.',
  keywords: 'AI jewelry, virtual try-on, jewelry visualization, AI fashion, jewelry marketing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
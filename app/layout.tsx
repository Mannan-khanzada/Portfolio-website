import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mannan Khanzada — Developer & Digital Builder',
  description: 'Portfolio of Mannan Khanzada. Explore live web projects, interactive experiences, and digital work.',
  openGraph: {
    title: 'Mannan Khanzada — Developer & Digital Builder',
    description: 'Explore live projects, interactive website previews, and digital work by Mannan Khanzada.',
    type: 'website',
  },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#030303' };
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

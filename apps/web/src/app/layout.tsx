import type {Metadata, Viewport} from 'next';
import localFont from 'next/font/local';
import {tokens} from '@weave/design-tokens';
import type {CSSProperties, ReactNode} from 'react';
import './globals.css';
const figtree = localFont({
  src: './fonts/Figtree.ttf',
  weight: '300 900',
  display: 'swap',
});
export const metadata: Metadata = {
  title: 'Weave',
  description: 'Weave workspace',
  manifest: '/site.webmanifest',
};
export const viewport: Viewport = {themeColor: tokens.colors.primary};
export default function RootLayout({children}: Readonly<{children: ReactNode}>): React.JSX.Element {
  const theme = {
    '--background': tokens.colors.background,
    '--surface': tokens.colors.surface,
    '--text': tokens.colors.text,
    '--primary': tokens.colors.primary,
    '--border': tokens.colors.border,
  } as CSSProperties;
  return (
    <html lang="en">
      <body className={figtree.className} style={theme}>
        {children}
      </body>
    </html>
  );
}

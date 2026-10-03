import type {Metadata} from 'next';
import {tokens} from '@weave/design-tokens';
import type {CSSProperties, ReactNode} from 'react';
import './globals.css';
export const metadata: Metadata = {title: 'Weave', description: 'Weave monorepo'};
export default function RootLayout({children}: Readonly<{children: ReactNode}>): React.JSX.Element {
  const theme = {
    '--background': tokens.colors.background,
    '--surface': tokens.colors.surface,
    '--text': tokens.colors.text,
    '--primary': tokens.colors.primary,
  } as CSSProperties;
  return (
    <html lang="en">
      <body style={theme}>{children}</body>
    </html>
  );
}

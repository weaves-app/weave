import localFont from 'next/font/local';
import {ClerkProvider} from '@clerk/nextjs';
import {connection} from 'next/server';
import {readClerkConfiguration} from '../features/auth/infrastructure/configuration';
import type {Metadata} from 'next';
import {tokens} from '@weave/design-tokens';
import type {CSSProperties, ReactNode} from 'react';
import './globals.css';
const figtree = localFont({
  src: '../../public/brand/Figtree.ttf',
  variable: '--font-figtree',
  display: 'swap',
});
export const metadata: Metadata = {
  title: 'Weave',
  description: 'Everything, woven together.',
  icons: {icon: '/brand/favicon.svg'},
};
export default async function RootLayout({
  children,
}: Readonly<{children: ReactNode}>): Promise<React.JSX.Element> {
  await connection();
  const configuration = readClerkConfiguration(process.env);
  const theme = {
    '--background': tokens.colors.background,
    '--surface': tokens.colors.surface,
    '--text': tokens.colors.text,
    '--primary': tokens.colors.primary,
  } as CSSProperties;
  return (
    <html lang="en">
      <body className={figtree.variable} style={theme}>
        {configuration ? (
          <ClerkProvider
            dynamic
            publishableKey={configuration.publishableKey}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            taskUrls={{'choose-organization': '/organizations'}}
          >
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}

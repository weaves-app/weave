import Image from 'next/image';

import {authTokens} from '@weave/design-tokens';

import type {CSSProperties, ReactNode} from 'react';

import {AuthArtwork} from './artwork/auth-artwork';

export interface AuthShellProps {
  readonly children: ReactNode;
  readonly animateArtwork?: boolean;
}

export function AuthShell({children, animateArtwork = false}: AuthShellProps): React.JSX.Element {
  const theme = {
    '--auth-primary': authTokens.colors.primary,
    '--auth-secondary': authTokens.colors.secondary,
    '--auth-hero': authTokens.colors.hero,
    '--auth-accent': authTokens.colors.accent,
    '--auth-background': authTokens.colors.background,
    '--auth-motion-feedback': `${authTokens.motion.feedbackMs}ms`,
    '--auth-motion-easing': authTokens.motion.easing,
  } as CSSProperties;

  return (
    <main className="auth-shell" style={theme}>
      <section className="auth-scene" aria-label="Weave brand">
        <AuthArtwork animate={animateArtwork} />
        <div className="auth-caption">
          <h1>Everything, woven together.</h1>
          <p>
            No more loose threads.
            <br />
            From order to shelf.
          </p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <Image
            className="auth-logo"
            src="/brand/logo.svg"
            alt="Weave"
            width={133}
            height={43}
            priority
          />
          {children}
        </div>
      </section>
    </main>
  );
}

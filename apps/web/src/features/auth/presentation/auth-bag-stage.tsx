'use client';

import {useEffect, useRef} from 'react';
import type {ReactNode} from 'react';

export interface AuthBagStageProps {
  readonly children: ReactNode;
}

export function AuthBagStage({children}: AuthBagStageProps): React.JSX.Element {
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = stage.current;
    const image = element?.querySelector('img');

    if (!element || !image || typeof window.matchMedia !== 'function') return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 681px)');
    let attempted = false;

    const stop = (): void => element.classList.remove('auth-bag-enter');

    const preferenceChanged = (): void => {
      if (reduced.matches) stop();
    };

    const arrive = (): void => {
      if (attempted || reduced.matches || !desktop.matches) return;

      attempted = true;

      try {
        const key = 'weave.auth.bag-entrance.v1';

        if (window.sessionStorage.getItem(key)) return;

        window.sessionStorage.setItem(key, 'seen');
      } catch {
        // Keep the bag static when the browser cannot persist the one-shot guard.
        return;
      }

      element.classList.add('auth-bag-enter');
    };

    image.addEventListener('load', arrive);
    element.addEventListener('animationend', stop);
    reduced.addEventListener('change', preferenceChanged);

    if (image.complete && image.naturalWidth > 0) arrive();

    return () => {
      image.removeEventListener('load', arrive);
      element.removeEventListener('animationend', stop);
      reduced.removeEventListener('change', preferenceChanged);
    };
  }, []);

  return (
    <div ref={stage} className="auth-bag-stage">
      {children}
    </div>
  );
}

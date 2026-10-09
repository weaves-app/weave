import {useEffect, useRef, useState} from 'react';
import type {RefObject} from 'react';

const INTRO_SOURCE = '/brand/woven/intro.v1.mp4';

const READINESS_TIMEOUT_MS = 500;

const PLAYBACK_TIMEOUT_MS = 1250;

type IntroPhase = 'pending' | 'playing' | 'still';

interface ArtworkIntro {
  readonly videoRef: RefObject<HTMLVideoElement | null>;
  readonly phase: IntroPhase;
}

export function useArtworkIntro(animate: boolean): ArtworkIntro {
  const videoRef = useRef<HTMLVideoElement>(null);
  const settled = useRef(false);
  const [phase, setPhase] = useState<IntroPhase>(animate ? 'pending' : 'still');

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    if (!animate || settled.current || typeof window.matchMedia !== 'function') {
      settled.current = true;
      setPhase('still');

      return;
    }

    const desktop = window.matchMedia('(min-width: 681px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const readyBy = performance.now() + READINESS_TIMEOUT_MS;
    let active = true;
    let started = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const release = (): void => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    const finish = (): void => {
      if (!active || settled.current) return;

      settled.current = true;
      clearTimeout(timeout);
      release();
      setPhase('still');
    };

    const eligible = (): boolean =>
      desktop.matches && !reduced.matches && document.visibilityState === 'visible';

    const checkEligibility = (): void => {
      if (!eligible()) finish();
    };

    const start = (): void => {
      if (!active || settled.current || started) return;

      if (!eligible() || performance.now() > readyBy) {
        finish();

        return;
      }

      started = true;
      clearTimeout(timeout);
      timeout = setTimeout(finish, PLAYBACK_TIMEOUT_MS);
      void video.play().catch(finish);
    };

    const showVideo = (): void => {
      if (active && started && !settled.current) setPhase('playing');
    };

    video.addEventListener('canplay', start);
    video.addEventListener('playing', showVideo);
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    desktop.addEventListener('change', checkEligibility);
    reduced.addEventListener('change', checkEligibility);
    document.addEventListener('visibilitychange', checkEligibility);

    if (eligible()) {
      timeout = setTimeout(finish, READINESS_TIMEOUT_MS);
      video.src = INTRO_SOURCE;
      video.load();
    } else {
      finish();
    }

    return () => {
      active = false;

      // Strict Mode may clean up before readiness; actual playback remains one-shot.
      if (started) settled.current = true;

      clearTimeout(timeout);
      video.removeEventListener('canplay', start);
      video.removeEventListener('playing', showVideo);
      video.removeEventListener('ended', finish);
      video.removeEventListener('error', finish);
      desktop.removeEventListener('change', checkEligibility);
      reduced.removeEventListener('change', checkEligibility);
      document.removeEventListener('visibilitychange', checkEligibility);
      release();
    };
  }, [animate]);

  return {videoRef, phase};
}

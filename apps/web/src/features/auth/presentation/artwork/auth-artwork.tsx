'use client';

import Image from 'next/image';

import {useArtworkIntro} from './use-artwork-intro';
import styles from './auth-artwork.module.css';

export interface AuthArtworkProps {
  readonly animate?: boolean;
}

export function AuthArtwork({animate = false}: AuthArtworkProps): React.JSX.Element {
  const {videoRef, phase} = useArtworkIntro(animate);

  return (
    <div className={styles.stage} data-phase={phase} aria-hidden="true">
      <video
        ref={videoRef}
        className={styles.video}
        hidden={phase !== 'playing'}
        muted
        playsInline
        preload="none"
        tabIndex={-1}
        disablePictureInPicture
      />
      <Image
        className={styles.still}
        src="/brand/woven/still.v1.webp"
        alt=""
        width={1280}
        height={1280}
        sizes="(max-width: 680px) 0px, 620px"
        preload
        unoptimized
      />
      <noscript>
        <style>{`.${styles.stage}[data-phase='pending'] .${styles.still}{visibility:visible}`}</style>
      </noscript>
    </div>
  );
}

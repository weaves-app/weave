'use client';

import Image from 'next/image';

import {authTokens} from '@weave/design-tokens';

import {useArtworkIntro} from './use-artwork-intro';
import styles from './auth-artwork.module.css';

const STILL_SOURCE = '/brand/woven/still.v1.webp';

// Native picture selection avoids a network request for the hidden mobile hero, even without JS.
const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

export interface AuthArtworkProps {
  readonly animate?: boolean;
}

export function AuthArtwork({animate = false}: AuthArtworkProps): React.JSX.Element {
  const {videoRef, phase} = useArtworkIntro(animate);

  return (
    <div className={styles.stage} data-phase={phase} aria-hidden="true">
      <link
        rel="preload"
        as="image"
        href={STILL_SOURCE}
        media={`(min-width: ${authTokens.layout.heroMinWidthPx}px)`}
      />
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
      <picture>
        <source
          media={`(max-width: ${authTokens.layout.heroMinWidthPx - 1}px)`}
          srcSet={EMPTY_IMAGE}
        />
        <Image
          className={styles.still}
          src={STILL_SOURCE}
          alt=""
          width={1280}
          height={1280}
          loading="eager"
          unoptimized
        />
      </picture>
      <noscript>
        <style>{`.${styles.stage}[data-phase='pending'] .${styles.still}{visibility:visible}`}</style>
      </noscript>
    </div>
  );
}

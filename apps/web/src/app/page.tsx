import {readHealth} from '../lib/health-client';
import Image from 'next/image';
export const dynamic = 'force-dynamic';
export default async function Home(): Promise<React.JSX.Element> {
  const apiStatus = await readHealth(
    {get: (url) => fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(2000)})},
    `${process.env.API_URL ?? 'http://localhost:3001'}/api/health`,
  );
  return (
    <main>
      <header className="brand-header">
        <h1 className="brand-logo">
          <Image
            src="/brand/weave-horizontal.svg"
            alt="Weave"
            width={702.086}
            height={224}
            priority
          />
        </h1>
        <p className="eyebrow">YOUR WORKSPACE</p>
      </header>
      <p>Next.js frontend. NestJS modular monolith. PostgreSQL with Prisma.</p>
      <section>
        <h2>Backend connection</h2>
        <p>{apiStatus}</p>
      </section>
    </main>
  );
}

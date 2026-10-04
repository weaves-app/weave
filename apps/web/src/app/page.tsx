import {readHealth} from '../lib/health-client';
export const dynamic = 'force-dynamic';
export default async function Home(): Promise<React.JSX.Element> {
  const apiStatus = await readHealth(
    {get: (url) => fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(2000)})},
    `${process.env.API_URL ?? 'http://localhost:3001'}/api/health`,
  );
  return (
    <main>
      <p className="eyebrow">YOUR WORKSPACE</p>
      <h1>Weave</h1>
      <p>Next.js frontend. NestJS modular monolith. PostgreSQL with Prisma.</p>
      <section>
        <h2>Backend connection</h2>
        <p>{apiStatus}</p>
      </section>
    </main>
  );
}

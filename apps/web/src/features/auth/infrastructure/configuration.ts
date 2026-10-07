export interface ClerkConfiguration {
  readonly publishableKey: string;
}
export function readClerkConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): ClerkConfiguration | null {
  const publishableKey = environment.CLERK_PUBLISHABLE_KEY;
  return publishableKey && environment.CLERK_SECRET_KEY ? {publishableKey} : null;
}

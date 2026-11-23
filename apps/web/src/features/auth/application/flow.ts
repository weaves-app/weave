import type {
  Attempt,
  AuthFlow,
  AuthGateway,
  AuthSnapshot,
  Credentials,
  FlowOptions,
} from './contracts';

import {AUTH_STAGE, AUTH_MODE} from './auth-constants';

export const DEFAULT_AUTH_TIMEOUT_MS = 30000;

function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';

  if ('errors' in error && Array.isArray(error.errors)) {
    const nested = errorCode(error.errors[0]);

    if (nested) return nested;
  }

  if ('code' in error && typeof error.code === 'string') return error.code;

  return '';
}

function recovery(error: unknown, invitation: boolean): string {
  const code = errorCode(error);

  if (code.includes('code'))
    return 'The verification code is incorrect or expired. Try again or request a new code.';

  if (code.includes('identifier_exists'))
    return 'This email is already registered. Sign in instead.';

  if (code.includes('password_incorrect') || code.includes('identifier_not_found'))
    return 'Email or password is incorrect. Try again.';

  if (code.includes('password'))
    return 'This password was rejected. Choose a stronger password and try again.';

  if (invitation)
    return 'This invitation could not be accepted. It may be invalid, expired or already used. Ask for a new invitation and try again.';

  return 'Authentication could not finish. Check your connection and try again.';
}

class AuthenticationFlow implements AuthFlow {
  private state: AuthSnapshot;
  private lastAttempt: Attempt;
  private generation = 0;
  private readonly listeners = new Set<() => void>();

  constructor(
    private gateway: AuthGateway,
    private readonly options: FlowOptions,
  ) {
    const initial = gateway.current(options.mode);

    this.lastAttempt = initial;
    this.state = {
      stage: initial.stage === AUTH_STAGE.UNSUPPORTED ? 'credentials' : initial.stage,
      pending: false,
      error: null,
    };
  }

  private complete = this.options.complete;

  readonly rebind = (gateway: AuthGateway, complete: (url: string) => void): void => {
    this.gateway = gateway;
    this.complete = complete;
  };

  readonly getSnapshot = (): AuthSnapshot => this.state;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  private update(changes: Partial<AuthSnapshot>): void {
    this.state = {...this.state, ...changes};
    this.listeners.forEach((listener) => listener());
  }

  private async run(work: (generation: number) => Promise<void>): Promise<void> {
    if (this.state.pending || this.state.stage === AUTH_STAGE.COMPLETE) return;

    const generation = this.generation;

    this.update({pending: true, error: null});

    let timer: ReturnType<typeof setTimeout> | undefined;
    const operation = work(generation).catch((error: unknown) => {
      if (generation === this.generation)
        this.update({error: recovery(error, this.options.mode === AUTH_MODE.INVITATION)});
    });
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        if (generation === this.generation) {
          this.generation++;
          this.update({
            pending: false,
            error: 'Authentication timed out. Check your connection and try again.',
          });
        }

        resolve();
      }, this.options.timeoutMilliseconds ?? DEFAULT_AUTH_TIMEOUT_MS);
    });

    try {
      await Promise.race([operation, timeout]);
    } finally {
      clearTimeout(timer);

      if (generation === this.generation) this.update({pending: false});
    }
  }

  private async advance(attempt: Attempt, generation: number): Promise<void> {
    if (generation !== this.generation) return;

    if (attempt.stage === AUTH_STAGE.VERIFICATION) {
      this.update({stage: 'verification'});

      return;
    }

    if (
      attempt.stage !== AUTH_STAGE.READY ||
      (this.options.mode !== AUTH_MODE.SIGN_IN && !attempt.verified)
    ) {
      this.update({
        error: 'Authentication requirements are incomplete. Verify your email or contact support.',
      });

      return;
    }

    this.lastAttempt = attempt;
    this.update({stage: 'ready'});

    const destination = await this.gateway.activate(this.options.mode);

    if (generation !== this.generation) {
      await this.gateway.deactivate();

      return;
    }

    this.update({stage: 'complete'});
    this.complete(destination);
  }

  readonly submit = async (input: Credentials): Promise<void> => {
    if (this.state.pending || this.state.stage === AUTH_STAGE.COMPLETE) return;

    if (this.state.stage === AUTH_STAGE.READY) {
      await this.run((generation) => this.advance(this.lastAttempt, generation));

      return;
    }

    if (
      !input.password ||
      (this.options.mode !== AUTH_MODE.INVITATION &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
    ) {
      this.update({error: 'Enter a valid email address and password.'});

      return;
    }

    if (this.options.mode === AUTH_MODE.INVITATION && !this.options.ticket) {
      this.update({error: 'This invitation is invalid. Ask for a new invitation.'});

      return;
    }

    await this.run(async (generation) => {
      let attempt: Attempt;

      if (this.options.mode === AUTH_MODE.INVITATION && this.options.ticket) {
        attempt = await this.gateway.invite(this.options.ticket, input.password);
      } else if (this.options.mode === AUTH_MODE.SIGN_IN) {
        attempt = await this.gateway.signin({...input, email: input.email.trim()});
      } else {
        attempt = await this.gateway.signup({...input, email: input.email.trim()});
      }

      if (generation !== this.generation) return;

      // Keep verification recoverable even if sending the first code fails.
      if (attempt.stage === AUTH_STAGE.VERIFICATION) {
        this.update({stage: 'verification'});
        await this.gateway.sendCode(this.options.mode);
      }

      await this.advance(attempt, generation);
    });
  };

  readonly verify = async (code: string): Promise<void> => {
    if (this.state.pending || this.state.stage !== AUTH_STAGE.VERIFICATION) return;

    if (!code.trim()) {
      this.update({error: 'Enter the verification code.'});

      return;
    }

    await this.run(async (generation) =>
      this.advance(await this.gateway.verify(this.options.mode, code.trim()), generation),
    );
  };

  readonly google = async (): Promise<void> => {
    if (this.options.mode === AUTH_MODE.INVITATION || this.state.stage !== AUTH_STAGE.CREDENTIALS)
      return;

    await this.run(async () => {
      await this.gateway.google(this.options.mode);
    });
  };

  readonly resend = async (): Promise<void> => {
    if (this.state.stage !== AUTH_STAGE.VERIFICATION) return;

    await this.run(async () => {
      await this.gateway.sendCode(this.options.mode);
    });
  };

  readonly signOut = async (): Promise<void> => {
    this.generation++;
    this.update({stage: 'credentials', pending: false});
    await this.run(async () => {
      await this.gateway.deactivate();
    });
  };

  readonly cancel = (): void => {
    this.generation++;
    this.update({pending: false, error: null});
  };
}

export function createAuthFlow(gateway: AuthGateway, options: FlowOptions): AuthFlow {
  return new AuthenticationFlow(gateway, options);
}

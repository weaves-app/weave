import type {AuthResult, CodePurpose, SessionSnapshot} from '../domain/auth-models';

export interface OperationContext {
  readonly generation: number;
  readonly operationId: string;
}

export interface PasswordInput extends OperationContext {
  readonly email: string;
  readonly password: string;
}

export interface EmailInput extends OperationContext {
  readonly email: string;
}

export interface CodeInput extends OperationContext {
  readonly attemptId: string;
  readonly code: string;
  readonly codePurpose: CodePurpose;
}

export interface ResendInput extends OperationContext {
  readonly attemptId: string;
  readonly codePurpose: CodePurpose;
}

export interface SignOutInput extends OperationContext {
  readonly sessionId: string;
}

export interface AuthenticationGateway {
  resolveSession(input: OperationContext): Promise<SessionSnapshot>;
  subscribe(observer: (snapshot: SessionSnapshot) => void): () => void;
  password(input: PasswordInput): Promise<AuthResult>;
  requestCode(input: EmailInput): Promise<AuthResult>;
  verifyCode(input: CodeInput): Promise<AuthResult>;
  resendCode(input: ResendInput): Promise<AuthResult>;
  google(input: OperationContext): Promise<AuthResult>;
  signOut(input: SignOutInput): Promise<SessionSnapshot>;
  abandon(input: OperationContext): Promise<void>;
  dispose(): void;
}

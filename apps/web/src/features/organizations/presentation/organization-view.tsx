'use client';
import {useState, useSyncExternalStore} from 'react';
import type {FormEvent} from 'react';
import {AuthShell} from '../../auth/presentation/auth-shell';
import {SignOutControl} from '../../auth/presentation/home-view';
import type {OrganizationFlow} from '../application/contracts';
export interface OrganizationViewProps {
  readonly flow: OrganizationFlow;
  readonly mode: 'choose' | 'create';
  readonly email: string;
  readonly signOut: () => Promise<void>;
  readonly signedOut: () => void;
}
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /^[a-z]/i.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toLowerCase();
}
export function OrganizationView({
  flow,
  mode,
  email,
  signOut,
  signedOut,
}: OrganizationViewProps): React.JSX.Element {
  const state = useSyncExternalStore(flow.subscribe, flow.getSnapshot, flow.getSnapshot);
  const [name, setName] = useState('');
  const selected = state.organizations.find((org) => org.id === state.selectedId);
  const create = mode === 'create';
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void (create ? flow.create(name) : flow.open());
  };
  const busy = state.pending || state.loading;
  return (
    <AuthShell>
      {create && (
        <a className="org-back" href="/organizations" onClick={flow.cancel}>
          ← Back to organizations
        </a>
      )}
      <h2>
        {create ? (
          <>
            A space of
            <br />
            your own.
          </>
        ) : (
          <>
            Choose your
            <br />
            organization
          </>
        )}
      </h2>
      <p className="auth-intro">
        {create
          ? 'Create your organization. Bring every loose thread together.'
          : 'A place for your people, your orders, and everything you’re making.'}
      </p>
      {state.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}
      {state.loading ? (
        <p role="status">Loading organizations…</p>
      ) : (
        <>
          {!create && state.error && (
            <button
              className="org-retry"
              disabled={busy}
              onClick={() => {
                void flow.load();
              }}
            >
              Reload organizations
            </button>
          )}
          {create || state.organizations.length > 0 ? (
            <form onSubmit={submit} aria-busy={busy}>
              {create ? (
                <>
                  <label htmlFor="organization-name">Organization name</label>
                  <input
                    id="organization-name"
                    name="name"
                    value={state.created?.name ?? name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Thread & Form"
                    autoComplete="organization"
                    maxLength={80}
                    required
                    disabled={busy || state.created !== null}
                  />
                  <div className="org-preview">
                    <span className="org-monogram">
                      {initials(state.created?.name ?? name) || 'yo'}
                    </span>
                    <span>
                      <strong>{state.created?.name ?? (name.trim() || 'Your organization')}</strong>
                      <small>Your role · Administrator</small>
                    </span>
                  </div>
                  <p className="org-note">
                    You’ll manage this organization. Invite your team from Settings when you’re
                    ready.
                  </p>
                </>
              ) : (
                <>
                  <fieldset className="org-list">
                    <legend>
                      Your organizations <span>{state.organizations.length}</span>
                    </legend>
                    {state.organizations.map((org) => (
                      <label
                        className={`org-option ${org.id === state.selectedId ? 'selected' : ''}`}
                        key={org.id}
                      >
                        <input
                          type="radio"
                          name="organization"
                          value={org.id}
                          checked={org.id === state.selectedId}
                          disabled={busy}
                          onChange={() => flow.select(org.id)}
                        />
                        <span className="org-monogram">{initials(org.name)}</span>
                        <span className="org-copy">
                          <strong>{org.name}</strong>
                          <small>
                            {org.invitationId ? 'Invitation pending · ' : ''}
                            {org.role.replace(/^org:/, '').replaceAll('_', ' ')}
                          </small>
                        </span>
                        <span className="org-radio" aria-hidden="true" />
                      </label>
                    ))}
                  </fieldset>
                  <p className="org-note">
                    {selected?.invitationId
                      ? 'Accept the invitation and open'
                      : 'Open the workspace for'}{' '}
                    <strong>{selected?.name}</strong>.
                  </p>
                </>
              )}
              <button
                className="auth-primary"
                disabled={busy || (!create && !selected)}
                type="submit"
              >
                {state.pending
                  ? 'Opening workspace…'
                  : create
                    ? state.created
                      ? 'Open workspace'
                      : 'Create organization'
                    : 'Open workspace'}
              </button>
              <p className="auth-status" role="status">
                {state.pending ? 'Please wait…' : ''}
              </p>
            </form>
          ) : (
            !state.error && (
              <div className="org-empty">
                <span aria-hidden="true">＋</span>
                <h3>No organizations yet</h3>
                <p>
                  Create an organization to get started. Organizations you join will appear here.
                </p>
              </div>
            )
          )}
          {!create && (
            <>
              <div className="auth-divider">or start something of your own</div>
              <a className="org-create-link" href="/organizations/create" onClick={flow.cancel}>
                <span aria-hidden="true">＋</span> Create an organization{' '}
                <span aria-hidden="true">↗</span>
              </a>
            </>
          )}
        </>
      )}
      <div className="org-account">
        <span>Signed in as {email}</span>
        <SignOutControl
          signOut={() => {
            flow.cancel();
            return signOut();
          }}
          signedOut={signedOut}
        />
      </div>
    </AuthShell>
  );
}

import { FormEvent, useState } from 'react';

interface PasswordProtectedProps {
  title: string;
  errorMessage?: string;
  isSubmitting?: boolean;
  onSubmit: (password: string) => void;
}

function PasswordProtected({ title, errorMessage, isSubmitting, onSubmit }: PasswordProtectedProps) {
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setLocalError('Password is required');
      return;
    }
    setLocalError('');
    onSubmit(password);
  }

  const displayedError = localError || errorMessage;

  return (
    <section className="password-panel" aria-labelledby="password-title">
      <div>
        <p className="section-label">Password required</p>
        <h3 id="password-title">{title}</h3>
        <p className="muted">
          This paste requires a password before content can be displayed.
        </p>
      </div>

      <form className="password-form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Password</span>
          <input
            aria-invalid={!!displayedError}
            aria-describedby={displayedError ? 'password-error' : undefined}
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (localError) setLocalError('');
            }}
            autoFocus
          />
        </label>

        {displayedError ? (
          <p id="password-error" className="error-text" role="alert" aria-live="assertive">
            {displayedError}
          </p>
        ) : null}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Unlocking...' : 'Unlock'}
        </button>
      </form>
    </section>
  );
}

export default PasswordProtected;

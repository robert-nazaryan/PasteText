import { FormEvent, useState } from 'react';

interface PasswordProtectedProps {
  title: string;
  errorMessage?: string;
  onSubmit: (password: string) => void;
}

function PasswordProtected({ title, errorMessage, onSubmit }: PasswordProtectedProps) {
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(password);
  }

  return (
    <section className="password-panel" aria-labelledby="password-title">
      <div>
        <p className="section-label">Password required</p>
        <h3 id="password-title">{title}</h3>
        <p className="muted">
          This paste requires a password before content can be displayed.
        </p>
      </div>

      <form className="password-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Password</span>
          <input
            aria-describedby={errorMessage ? 'password-error' : undefined}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {errorMessage ? (
          <p id="password-error" className="error-text" aria-live="polite">
            {errorMessage}
          </p>
        ) : null}

        <button className="primary-button" type="submit">
          Unlock
        </button>
      </form>
    </section>
  );
}

export default PasswordProtected;

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import './App.css';
import 'highlight.js/styles/github.css';
import CreatePasteModal from './components/CreatePasteModal';
import Hero from './components/Hero';
import PasteCard from './components/PasteCard';
import PastePage from './components/PastePage';
import SearchBar from './components/SearchBar';
import { ApiError, AuthData, FieldErrors, PasteSortDir, PasteSortField, createPaste, login, register, searchPastes } from './api/api';
import { CreatePasteFormValues, Paste, SortOption } from './types';
import { hasFieldErrors, validateAuth, validateCreatePaste } from './utils/validation';

const PAGE_SIZE = 9;
const FACET_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_PARAMS: Record<SortOption, { sortBy: PasteSortField; sortDir: PasteSortDir }> = {
  newest: { sortBy: 'createdAt', sortDir: 'desc' },
  oldest: { sortBy: 'createdAt', sortDir: 'asc' },
  'most-viewed': { sortBy: 'views', sortDir: 'desc' },
};

const initialFormValues: CreatePasteFormValues = {
  title: '',
  content: '',
  tags: '',
  visibility: 'public',
  expiresIn: 'Never',
  password: '',
  burnAfterRead: false,
};

function extractErrorState(err: unknown, fallback: string): { message: string; fieldErrors: FieldErrors } {
  if (err instanceof ApiError) {
    const fieldErrors = err.fieldErrors ?? {};
    const message = hasFieldErrors(fieldErrors) ? '' : err.message || fallback;
    return { message, fieldErrors };
  }
  return {
    message: err instanceof Error && err.message ? err.message : fallback,
    fieldErrors: {},
  };
}

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [authEmail, setAuthEmail] = useState<string | null>(() => localStorage.getItem('auth_email'));
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginFieldErrors, setLoginFieldErrors] = useState<FieldErrors>({});
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);

  const [pastes, setPastes] = useState<Paste[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [facetPastes, setFacetPastes] = useState<Paste[]>([]);
  const [pastesError, setPastesError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [refetchKey, setRefetchKey] = useState(0);
  const [isLoadingResults, setIsLoadingResults] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createValues, setCreateValues] = useState<CreatePasteFormValues>(initialFormValues);
  const [createError, setCreateError] = useState('');
  const [createFieldErrors, setCreateFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    searchPastes(
      { size: FACET_SIZE, publicOnly: token ? false : undefined },
      token,
    )
      .then((res) => {
        if (!cancelled) setFacetPastes(res.items);
      })
      .catch(() => {
        if (!cancelled) setFacetPastes([]);
      });
    return () => { cancelled = true; };
  }, [token, refetchKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, selectedTag, selectedAuthor, sortOption]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingResults(true);
    setPastesError('');
    const { sortBy, sortDir } = SORT_PARAMS[sortOption];
    searchPastes(
      {
        keyword: debouncedQuery || undefined,
        tag: selectedTag || undefined,
        authorEmail: selectedAuthor || undefined,
        sortBy,
        sortDir,
        page: currentPage - 1,
        size: PAGE_SIZE,
        publicOnly: token ? false : undefined,
      },
      token,
    )
      .then((res) => {
        if (cancelled) return;
        setPastes(res.items);
        setTotalCount(res.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setPastes([]);
        setTotalCount(0);
        setPastesError(err instanceof Error ? err.message : 'Failed to load pastes');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingResults(false);
      });
    return () => { cancelled = true; };
  }, [token, debouncedQuery, selectedTag, selectedAuthor, sortOption, currentPage, refetchKey]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const authors = useMemo(
    () => Array.from(new Set(facetPastes.map((p) => p.author))).sort(),
    [facetPastes]
  );

  const tags = useMemo(
    () => Array.from(new Set(facetPastes.flatMap((p) => p.tags))).sort(),
    [facetPastes]
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function openCreateModal() {
    if (!token) {
      setIsLoginOpen(true);
      setToastMessage('Please log in to create a paste');
      return;
    }
    setCreateError('');
    setCreateFieldErrors({});
    setCreateValues(initialFormValues);
    setIsCreateOpen(true);
  }

  function handleCreateValuesChange(next: CreatePasteFormValues) {
    setCreateValues(next);
    if (createError) setCreateError('');
    if (hasFieldErrors(createFieldErrors)) {
      setCreateFieldErrors((prev) => {
        const cleared: FieldErrors = { ...prev };
        if (next.content.trim() && cleared.content) delete cleared.content;
        if (next.title.length <= 255 && cleared.title) delete cleared.title;
        if ((!next.password || next.password.length <= 72) && cleared.password) delete cleared.password;
        return cleared;
      });
    }
  }

  async function handleCreateSubmit() {
    if (!token) {
      setCreateError('You must be logged in to create a paste');
      return;
    }
    const clientErrors = validateCreatePaste(createValues);
    if (hasFieldErrors(clientErrors)) {
      setCreateFieldErrors(clientErrors);
      setCreateError('');
      return;
    }
    setCreateError('');
    setCreateFieldErrors({});
    setIsSubmitting(true);
    try {
      await createPaste(createValues, token);
      setIsCreateOpen(false);
      setCreateValues(initialFormValues);
      setCurrentPage(1);
      setRefetchKey((k) => k + 1);
      setToastMessage('Paste created');
    } catch (err) {
      const { message, fieldErrors } = extractErrorState(err, 'Failed to create paste');
      setCreateFieldErrors(fieldErrors);
      setCreateError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAuthSuccess(data: AuthData) {
    localStorage.setItem('auth_token', data.accessToken);
    localStorage.setItem('auth_email', data.email);
    setToken(data.accessToken);
    setAuthEmail(data.email);
    setIsLoginOpen(false);
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
    setLoginFieldErrors({});
    setToastMessage(`Welcome, ${data.email}`);
  }

  function clearLoginFieldError(field: keyof FieldErrors) {
    setLoginFieldErrors((prev) => {
      if (!prev[field as string]) return prev;
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
    if (loginError) setLoginError('');
  }

  async function handleLoginSubmit(event: FormEvent) {
    event.preventDefault();
    const clientErrors = validateAuth(loginEmail, loginPassword, loginMode);
    if (hasFieldErrors(clientErrors)) {
      setLoginFieldErrors(clientErrors);
      setLoginError('');
      return;
    }
    setIsLoginSubmitting(true);
    setLoginError('');
    setLoginFieldErrors({});
    try {
      if (loginMode === 'login') {
        handleAuthSuccess(await login(loginEmail.trim(), loginPassword));
      } else {
        handleAuthSuccess(await register(loginEmail.trim(), loginPassword));
      }
    } catch (err) {
      const { message, fieldErrors } = extractErrorState(err, 'Authentication failed');
      setLoginFieldErrors(fieldErrors);
      setLoginError(message);
    } finally {
      setIsLoginSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
    setToken(null);
    setAuthEmail(null);
    setPastes([]);
    setTotalCount(0);
    setFacetPastes([]);
    setToastMessage('Logged out');
  }

  function switchMode(mode: 'login' | 'register') {
    setLoginMode(mode);
    setLoginError('');
    setLoginFieldErrors({});
  }

  const homeContent = (
    <main className="app-layout">
      <Hero onCreatePaste={openCreateModal} />

      <SearchBar
        searchQuery={searchQuery}
        selectedTag={selectedTag}
        selectedAuthor={selectedAuthor}
        sortOption={sortOption}
        authors={authors}
        tags={tags}
        onSearchChange={setSearchQuery}
        onTagChange={setSelectedTag}
        onAuthorChange={setSelectedAuthor}
        onSortChange={setSortOption}
      />

      <div className="results-section">
        <div className="results-header">
          <p className="muted">{totalCount} paste{totalCount !== 1 ? 's' : ''}</p>
          <button className="secondary-button" type="button" onClick={openCreateModal}>
            New paste
          </button>
        </div>

        {isLoadingResults && (
          <div className="skeleton-grid" aria-label="Loading pastes">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card" aria-hidden="true" />
            ))}
          </div>
        )}

        {!isLoadingResults && pastesError && (
          <section className="panel empty-state">
            <h2>Couldn't load pastes</h2>
            <p className="error-text" aria-live="polite">{pastesError}</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setRefetchKey((k) => k + 1)}
            >
              Retry
            </button>
          </section>
        )}

        {!isLoadingResults && !pastesError && !pastes.length && (
          <section className="panel empty-state">
            <h2>No pastes found</h2>
            <p className="muted">Adjust your filters or create a new paste.</p>
            <button className="primary-button" type="button" onClick={openCreateModal}>
              Create paste
            </button>
          </section>
        )}

        {!isLoadingResults && !pastesError && pastes.length > 0 && (
          <div className="results-grid">
            {pastes.map((paste) => (
              <PasteCard key={paste.id} paste={paste} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="pagination" aria-label="Pagination">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="muted">Page {currentPage} of {totalPages}</span>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </nav>
        )}
      </div>
    </main>
  );

  return (
    <div className="app-shell">
      <nav className="navbar">
        <Link to="/" className="nav-brand">PasteText</Link>
        <div className="nav-actions">
          {authEmail ? (
            <>
              <span className="muted nav-user">{authEmail}</span>
              <button className="secondary-button" type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <button
              className="secondary-button"
              type="button"
              onClick={() => { setIsLoginOpen(true); switchMode('login'); }}
            >
              Login / Register
            </button>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={homeContent} />
        <Route
          path="/p/:slug"
          element={
            <PastePage
              token={token}
              authEmail={authEmail}
              onToast={setToastMessage}
            />
          }
        />
      </Routes>

      <CreatePasteModal
        isOpen={isCreateOpen}
        values={createValues}
        errorMessage={createError}
        fieldErrors={createFieldErrors}
        isSubmitting={isSubmitting}
        onClose={() => { setIsCreateOpen(false); setCreateError(''); setCreateFieldErrors({}); }}
        onSubmit={handleCreateSubmit}
        onChange={handleCreateValuesChange}
      />

      {isLoginOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsLoginOpen(false)}>
          <section
            className="modal auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="section-label">{loginMode === 'login' ? 'Sign in' : 'Create account'}</p>
                <h2 id="auth-title">{loginMode === 'login' ? 'Welcome back' : 'Join PasteText'}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close" onClick={() => setIsLoginOpen(false)}>
                ✕
              </button>
            </div>

            <button
              className="google-button"
              type="button"
              onClick={() => setLoginError('Google sign-in is not yet configured')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="auth-divider"><span>or</span></div>

            <form className="auth-form" onSubmit={handleLoginSubmit} noValidate>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => { setLoginEmail(e.target.value); clearLoginFieldError('email'); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={!!loginFieldErrors.email}
                  aria-describedby={loginFieldErrors.email ? 'auth-email-error' : undefined}
                />
                {loginFieldErrors.email && (
                  <span id="auth-email-error" className="field-error" aria-live="polite">
                    {loginFieldErrors.email}
                  </span>
                )}
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); clearLoginFieldError('password'); }}
                  placeholder="Password"
                  autoComplete={loginMode === 'login' ? 'current-password' : 'new-password'}
                  aria-invalid={!!loginFieldErrors.password}
                  aria-describedby={loginFieldErrors.password ? 'auth-password-error' : undefined}
                />
                {loginFieldErrors.password && (
                  <span id="auth-password-error" className="field-error" aria-live="polite">
                    {loginFieldErrors.password}
                  </span>
                )}
              </label>

              {loginError && (
                <p className="error-text" role="alert" aria-live="assertive">{loginError}</p>
              )}

              <button className="primary-button" type="submit" disabled={isLoginSubmitting}>
                {isLoginSubmitting ? 'Please wait...' : loginMode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p className="auth-switch">
              {loginMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                className="link-button"
                type="button"
                onClick={() => switchMode(loginMode === 'login' ? 'register' : 'login')}
              >
                {loginMode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </section>
        </div>
      )}

      <div className="toast-region" aria-live="polite">
        {toastMessage && <div className="toast">{toastMessage}</div>}
      </div>
    </div>
  );
}

export default App;

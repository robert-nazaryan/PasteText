import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import './App.css';
import 'highlight.js/styles/github.css';
import CreatePasteModal from './components/CreatePasteModal';
import Hero from './components/Hero';
import PasteCard from './components/PasteCard';
import PastePage from './components/PastePage';
import SearchBar from './components/SearchBar';
import { AuthData, createPaste, fetchPastes, login, register } from './api';
import { CreatePasteFormValues, Paste, PasteLanguage, SortOption } from './types';

const initialFormValues: CreatePasteFormValues = {
  title: '',
  content: '',
  language: 'auto',
  tags: '',
  visibility: 'public',
  expiresIn: 'Never',
  password: '',
  burnAfterRead: false,
};

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [authEmail, setAuthEmail] = useState<string | null>(() => localStorage.getItem('auth_email'));
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);

  const [pastes, setPastes] = useState<Paste[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<PasteLanguage | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingResults, setIsLoadingResults] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createValues, setCreateValues] = useState<CreatePasteFormValues>(initialFormValues);
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    setIsLoadingResults(true);
    fetchPastes(token)
      .then(setPastes)
      .catch(() => setPastes([]))
      .finally(() => setIsLoadingResults(false));
  }, [token]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const authors = useMemo(
    () => Array.from(new Set(pastes.map((p) => p.author))).sort(),
    [pastes]
  );

  const tags = useMemo(
    () => Array.from(new Set(pastes.flatMap((p) => p.tags))).sort(),
    [pastes]
  );

  const filteredPastes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const visible = pastes.filter((p) => {
      const accessible = p.visibility === 'public' || p.author === authEmail;
      const matchesQuery =
        !query ||
        p.title.toLowerCase().includes(query) ||
        p.tags.some((t) => t.toLowerCase().includes(query)) ||
        p.content.toLowerCase().includes(query);
      const matchesLanguage = selectedLanguage === 'all' || p.language === selectedLanguage;
      const matchesTag = !selectedTag || p.tags.includes(selectedTag);
      const matchesAuthor = !selectedAuthor || p.author === selectedAuthor;
      return accessible && matchesQuery && matchesLanguage && matchesTag && matchesAuthor;
    });

    return [...visible].sort((a, b) => {
      if (sortOption === 'most-viewed') return b.views - a.views;
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      return sortOption === 'oldest' ? at - bt : bt - at;
    });
  }, [pastes, authEmail, searchQuery, selectedLanguage, selectedTag, selectedAuthor, sortOption]);

  const totalPages = Math.max(1, Math.ceil(filteredPastes.length / 9));
  const paginatedPastes = useMemo(() => {
    const start = (currentPage - 1) * 9;
    return filteredPastes.slice(start, start + 9);
  }, [currentPage, filteredPastes]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedLanguage, selectedTag, selectedAuthor, sortOption]);
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
    setCreateValues(initialFormValues);
    setIsCreateOpen(true);
  }

  async function handleCreateSubmit() {
    if (!createValues.content.trim()) { setCreateError('Paste content is required'); return; }
    if (createValues.password && createValues.password.length < 12) {
      setCreateError('Password must be at least 12 characters');
      return;
    }
    if (!token) { setCreateError('You must be logged in to create a paste'); return; }
    setCreateError('');
    setIsSubmitting(true);
    try {
      const newPaste = await createPaste(createValues, token);
      setPastes((prev) => [newPaste, ...prev]);
      setIsCreateOpen(false);
      setCreateValues(initialFormValues);
      setToastMessage('Paste created');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create paste');
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
    setToastMessage(`Welcome, ${data.email}`);
  }

  async function handleLoginSubmit(event: FormEvent) {
    event.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Email and password are required');
      return;
    }
    setIsLoginSubmitting(true);
    setLoginError('');
    try {
      if (loginMode === 'login') {
        handleAuthSuccess(await login(loginEmail.trim(), loginPassword));
      } else {
        handleAuthSuccess(await register(loginEmail.trim(), loginPassword));
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Authentication failed');
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
    setToastMessage('Logged out');
  }

  function switchMode(mode: 'login' | 'register') {
    setLoginMode(mode);
    setLoginError('');
  }

  const homeContent = (
    <main className="app-layout">
      <Hero onCreatePaste={openCreateModal} />

      <SearchBar
        searchQuery={searchQuery}
        selectedLanguage={selectedLanguage}
        selectedTag={selectedTag}
        selectedAuthor={selectedAuthor}
        sortOption={sortOption}
        authors={authors}
        tags={tags}
        onSearchChange={setSearchQuery}
        onLanguageChange={setSelectedLanguage}
        onTagChange={setSelectedTag}
        onAuthorChange={setSelectedAuthor}
        onSortChange={setSortOption}
      />

      <div className="results-section">
        <div className="results-header">
          <p className="muted">{filteredPastes.length} paste{filteredPastes.length !== 1 ? 's' : ''}</p>
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

        {!isLoadingResults && !paginatedPastes.length && (
          <section className="panel empty-state">
            <h2>No pastes found</h2>
            <p className="muted">Adjust your filters or create a new paste.</p>
            <button className="primary-button" type="button" onClick={openCreateModal}>
              Create paste
            </button>
          </section>
        )}

        {!isLoadingResults && paginatedPastes.length > 0 && (
          <div className="results-grid">
            {paginatedPastes.map((paste) => (
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
        isSubmitting={isSubmitting}
        onClose={() => { setIsCreateOpen(false); setCreateError(''); }}
        onSubmit={handleCreateSubmit}
        onChange={setCreateValues}
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

            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={loginMode === 'login' ? 'current-password' : 'new-password'}
                />
              </label>

              {loginError && (
                <p className="error-text" aria-live="polite">{loginError}</p>
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

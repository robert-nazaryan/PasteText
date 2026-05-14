import { FormEvent, Suspense, lazy, useEffect, useMemo, useState } from 'react';
import './App.css';
import 'highlight.js/styles/github.css';
import CreatePasteModal from './components/CreatePasteModal';
import Hero from './components/Hero';
import PasteCard from './components/PasteCard';
import SearchBar from './components/SearchBar';
import { AuthData, createPaste, deletePaste, fetchPastes, getPasteBySlug, login, register } from './api';
import { CreatePasteFormValues, Paste, PasteLanguage, SortOption } from './types';

const PasteDetail = lazy(() => import('./components/PasteDetail'));

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
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [selectedPasteId, setSelectedPasteId] = useState<string | null>(null);
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
  const [passwordError, setPasswordError] = useState('');
  const [unlockedPasteIds, setUnlockedPasteIds] = useState<string[]>([]);

  // Auth state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [authUsername, setAuthUsername] = useState<string | null>(() => localStorage.getItem('auth_username'));
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);

  // Load pastes from backend whenever auth changes
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
    () => Array.from(new Set(pastes.map((paste) => paste.author))).sort(),
    [pastes]
  );

  const tags = useMemo(
    () => Array.from(new Set(pastes.flatMap((paste) => paste.tags))).sort(),
    [pastes]
  );

  const accessiblePastes = useMemo(
    () => pastes.filter((paste) => paste.visibility === 'public' || paste.author === authUsername),
    [pastes, authUsername]
  );

  const filteredPastes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const visiblePastes = accessiblePastes.filter((paste) => {
      const matchesQuery =
        !query ||
        paste.title.toLowerCase().includes(query) ||
        paste.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        paste.content.toLowerCase().includes(query);
      const matchesLanguage = selectedLanguage === 'all' || paste.language === selectedLanguage;
      const matchesTag = !selectedTag || paste.tags.includes(selectedTag);
      const matchesAuthor = !selectedAuthor || paste.author === selectedAuthor;

      return matchesQuery && matchesLanguage && matchesTag && matchesAuthor;
    });

    const sortedPastes = [...visiblePastes];
    sortedPastes.sort((first, second) => {
      if (sortOption === 'most-viewed') return second.views - first.views;
      const firstTime = new Date(first.createdAt).getTime();
      const secondTime = new Date(second.createdAt).getTime();
      return sortOption === 'oldest' ? firstTime - secondTime : secondTime - firstTime;
    });

    return sortedPastes;
  }, [accessiblePastes, searchQuery, selectedLanguage, selectedTag, selectedAuthor, sortOption]);

  const totalPages = Math.max(1, Math.ceil(filteredPastes.length / 6));
  const paginatedPastes = useMemo(() => {
    const startIndex = (currentPage - 1) * 6;
    return filteredPastes.slice(startIndex, startIndex + 6);
  }, [currentPage, filteredPastes]);

  const selectedPaste = useMemo(
    () => pastes.find((paste) => paste.id === selectedPasteId) ?? null,
    [pastes, selectedPasteId]
  );

  const canRevealProtectedPaste =
    !selectedPaste?.requiresPassword ||
    (selectedPaste ? unlockedPasteIds.includes(selectedPaste.id) : false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLanguage, selectedTag, selectedAuthor, sortOption]);

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

  function closeCreateModal() {
    setIsCreateOpen(false);
    setCreateError('');
  }

  async function handleCreateSubmit() {
    if (!createValues.content.trim()) {
      setCreateError('Paste content is required');
      return;
    }
    if (createValues.password && createValues.password.length < 12) {
      setCreateError('Password must be at least 12 characters');
      return;
    }
    if (!token) {
      setCreateError('You must be logged in to create a paste');
      return;
    }

    setCreateError('');
    setIsSubmitting(true);

    try {
      const newPaste = await createPaste(createValues, token);
      setPastes((current) => [newPaste, ...current]);
      setSelectedPasteId(newPaste.id);
      setIsCreateOpen(false);
      setCreateValues(initialFormValues);
      setToastMessage('Paste created');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create paste');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOpenPaste(pasteId: string) {
    const nextPaste = pastes.find((paste) => paste.id === pasteId);
    if (!nextPaste) return;

    const canAccess = nextPaste.visibility === 'public' || nextPaste.author === authUsername;
    if (!canAccess) {
      setToastMessage('403 Forbidden');
      return;
    }

    setPasswordError('');
    setSelectedPasteId(nextPaste.id);

    // Password-protected pastes show the unlock form; content fetched on unlock
    if (nextPaste.requiresPassword) return;

    // Fetch full content (list endpoint returns previews without content)
    try {
      const full = await getPasteBySlug(nextPaste.slug);
      setPastes((current) =>
        current.map((p) =>
          p.id === pasteId ? { ...p, content: full.content, views: full.views } : p
        )
      );
    } catch {
      // non-blocking — detail panel will show empty content gracefully
    }
  }

  async function handleUnlock(password: string) {
    if (!selectedPaste) return;

    try {
      const unlockedPaste = await getPasteBySlug(selectedPaste.slug, password);
      setPastes((current) =>
        current.map((p) =>
          p.id === selectedPaste.id ? { ...p, content: unlockedPaste.content } : p
        )
      );
      setUnlockedPasteIds((current) => [...current, selectedPaste.id]);
      setPasswordError('');
      setToastMessage('Access granted');
    } catch {
      setPasswordError('Incorrect password');
    }
  }

  async function handleCopyUrl() {
    if (!selectedPaste) return;
    await navigator.clipboard.writeText(`${window.location.origin}/p/${selectedPaste.slug}`);
    setToastMessage('Copied to clipboard');
  }

  async function handleCopyContent() {
    if (!selectedPaste) return;
    await navigator.clipboard.writeText(selectedPaste.content);
    setToastMessage('Copied to clipboard');
  }

  async function handleDeletePaste() {
    if (!selectedPaste || !token) return;

    try {
      await deletePaste(selectedPaste.id, token);
      setPastes((current) => current.filter((p) => p.id !== selectedPaste.id));
      setSelectedPasteId(null);
      setToastMessage('Paste deleted');
    } catch {
      setToastMessage('Failed to delete paste');
    }
  }

  function goToPreviousPage() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goToNextPage() {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  }

  function handleAuthSuccess(data: AuthData) {
    localStorage.setItem('auth_token', data.accessToken);
    localStorage.setItem('auth_username', data.username);
    setToken(data.accessToken);
    setAuthUsername(data.username);
    setIsLoginOpen(false);
    setLoginUsername('');
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
    setToastMessage(`Welcome, ${data.username}`);
  }

  async function handleLoginSubmit(event: FormEvent) {
    event.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Username and password are required');
      return;
    }
    setIsLoginSubmitting(true);
    setLoginError('');
    try {
      if (loginMode === 'login') {
        handleAuthSuccess(await login(loginUsername.trim(), loginPassword));
      } else {
        if (!loginEmail.trim()) {
          setLoginError('Email is required');
          setIsLoginSubmitting(false);
          return;
        }
        handleAuthSuccess(await register(loginUsername.trim(), loginEmail.trim(), loginPassword));
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoginSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    setToken(null);
    setAuthUsername(null);
    setPastes([]);
    setSelectedPasteId(null);
    setToastMessage('Logged out');
  }

  return (
    <div className="app-shell">
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

        <section className="content-grid">
          <div className="results-column">
            <div className="results-header">
              <p className="muted">{filteredPastes.length} matching pastes</p>
              <button className="secondary-button" type="button" onClick={openCreateModal}>
                Create
              </button>
            </div>

            {isLoadingResults ? (
              <div className="skeleton-grid" aria-label="Loading pastes">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="skeleton-card" aria-hidden="true" />
                ))}
              </div>
            ) : null}

            {!isLoadingResults && !paginatedPastes.length ? (
              <section className="panel empty-state">
                <h2>No pastes found</h2>
                <p className="muted">Adjust filters or create a new paste.</p>
                <button className="primary-button" type="button" onClick={openCreateModal}>
                  Create
                </button>
              </section>
            ) : null}

            {!isLoadingResults && paginatedPastes.length ? (
              <div className="results-grid">
                {paginatedPastes.map((paste) => (
                  <PasteCard
                    key={paste.id}
                    paste={paste}
                    isActive={paste.id === selectedPasteId}
                    onOpen={handleOpenPaste}
                  />
                ))}
              </div>
            ) : null}

            <nav className="pagination" aria-label="Pagination">
              <button className="secondary-button" type="button" onClick={goToPreviousPage} disabled={currentPage === 1}>
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                className="secondary-button"
                type="button"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </nav>
          </div>

          <Suspense fallback={<aside className="panel detail-panel">Loading paste...</aside>}>
            <PasteDetail
              paste={selectedPaste}
              passwordError={passwordError}
              canRevealProtectedPaste={canRevealProtectedPaste}
              onUnlock={handleUnlock}
              onCopyUrl={handleCopyUrl}
              onCopyContent={handleCopyContent}
              onDelete={handleDeletePaste}
            />
          </Suspense>
        </section>
      </main>

      <footer className="footer">
        <div>
          <p>robertnazaryan00@gmail.com</p>
          <p>+374777777</p>
          <p>Kilovakan</p>
        </div>
        <div className="footer-links">
          {authUsername ? (
            <>
              <span className="muted">{authUsername}</span>
              <button className="secondary-button" type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <button
              className="secondary-button"
              type="button"
              onClick={() => { setIsLoginOpen(true); setLoginMode('login'); }}
            >
              Login / Register
            </button>
          )}
        </div>
      </footer>

      <CreatePasteModal
        isOpen={isCreateOpen}
        values={createValues}
        errorMessage={createError}
        isSubmitting={isSubmitting}
        onClose={closeCreateModal}
        onSubmit={handleCreateSubmit}
        onChange={setCreateValues}
      />

      {isLoginOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsLoginOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="section-label">{loginMode === 'login' ? 'Sign in' : 'Create account'}</p>
                <h2 id="login-title">{loginMode === 'login' ? 'Welcome back' : 'Join PasteText'}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close" onClick={() => setIsLoginOpen(false)}>
                Close
              </button>
            </div>

            <form className="create-form" onSubmit={handleLoginSubmit}>
              <label className="field field-full">
                <span>Username</span>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="your_username"
                  autoComplete="username"
                />
              </label>

              {loginMode === 'register' ? (
                <label className="field field-full">
                  <span>Email</span>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>
              ) : null}

              <label className="field field-full">
                <span>Password</span>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={loginMode === 'login' ? 'current-password' : 'new-password'}
                />
              </label>

              {loginError ? (
                <p className="error-text field-full" aria-live="polite">{loginError}</p>
              ) : null}

              <div className="modal-actions field-full">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => { setLoginMode(loginMode === 'login' ? 'register' : 'login'); setLoginError(''); }}
                >
                  {loginMode === 'login' ? 'Create account' : 'Sign in instead'}
                </button>
                <button className="primary-button" type="submit" disabled={isLoginSubmitting}>
                  {isLoginSubmitting ? 'Please wait...' : loginMode === 'login' ? 'Sign in' : 'Register'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <div className="toast-region" aria-live="polite">
        {toastMessage ? <div className="toast">{toastMessage}</div> : null}
      </div>
    </div>
  );
}

export default App;
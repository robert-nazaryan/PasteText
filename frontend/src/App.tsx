import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import './App.css';
import 'highlight.js/styles/github.css';
import CreatePasteModal from './components/CreatePasteModal';
import Hero from './components/Hero';
import PasteCard from './components/PasteCard';
import SearchBar from './components/SearchBar';
import { initialPastes } from './data/pastes';
import { CreatePasteFormValues, Paste, PasteLanguage, SortOption } from './types';
import { buildPaste } from './utils/pastes';

const PasteDetail = lazy(() => import('./components/PasteDetail'));

const CURRENT_USER = 'Robert Nazaryan';

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
  const [pastes, setPastes] = useState<Paste[]>(initialPastes);
  const [selectedPasteId, setSelectedPasteId] = useState<string | null>(initialPastes[0].id);
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

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoadingResults(false), 500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToastMessage(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const syncingPastes = pastes.filter((paste) => paste.syncStatus === 'syncing');
    if (!syncingPastes.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPastes((currentPastes) =>
        currentPastes.map((paste) =>
          paste.syncStatus === 'syncing' ? { ...paste, syncStatus: 'idle' } : paste
        )
      );
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [pastes]);

  const authors = useMemo(
    () => Array.from(new Set(pastes.map((paste) => paste.author))).sort(),
    [pastes]
  );

  const tags = useMemo(
    () => Array.from(new Set(pastes.flatMap((paste) => paste.tags))).sort(),
    [pastes]
  );

  const accessiblePastes = useMemo(
    () => pastes.filter((paste) => paste.visibility === 'public' || paste.author === CURRENT_USER),
    [pastes]
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
      if (sortOption === 'most-viewed') {
        return second.views - first.views;
      }

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
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function openCreateModal() {
    setCreateError('');
    setCreateValues(initialFormValues);
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    setIsCreateOpen(false);
    setCreateError('');
  }

  function handleCreateSubmit() {
    if (!createValues.content.trim()) {
      setCreateError('Paste content is required');
      return;
    }

    if (createValues.password && createValues.password.length < 12) {
      setCreateError('Password must be at least 12 characters');
      return;
    }

    setCreateError('');
    setIsSubmitting(true);

    const nextPaste = buildPaste(createValues, CURRENT_USER);
    setPastes((currentPastes) => [nextPaste, ...currentPastes]);
    setSelectedPasteId(nextPaste.id);
    setIsCreateOpen(false);
    setCreateValues(initialFormValues);
    setToastMessage('Paste created');

    window.setTimeout(() => {
      setIsSubmitting(false);
    }, 700);
  }

  function handleOpenPaste(pasteId: string) {
    const nextPaste = pastes.find((paste) => paste.id === pasteId);
    if (!nextPaste) {
      return;
    }

    const canAccess = nextPaste.visibility === 'public' || nextPaste.author === CURRENT_USER;
    if (!canAccess) {
      setToastMessage('403 Forbidden');
      return;
    }

    if (nextPaste.burnAfterRead) {
      setPastes((currentPastes) => currentPastes.filter((paste) => paste.id !== pasteId));
      setSelectedPasteId(null);
      setToastMessage('Paste destroyed after first read');
      return;
    }

    setPastes((currentPastes) =>
      currentPastes.map((paste) =>
        paste.id === pasteId ? { ...paste, views: paste.views + 1 } : paste
      )
    );
    setPasswordError('');
    setSelectedPasteId(nextPaste.id);
  }

  function handleUnlock(password: string) {
    if (!selectedPaste) {
      return;
    }

    if (password !== selectedPaste.password) {
      setPasswordError('Incorrect password');
      return;
    }

    setUnlockedPasteIds((currentIds) => [...currentIds, selectedPaste.id]);
    setPasswordError('');
    setToastMessage('Access granted');
  }

  async function handleCopyUrl() {
    if (!selectedPaste) {
      return;
    }

    await navigator.clipboard.writeText(`${window.location.origin}/p/${selectedPaste.slug}`);
    setToastMessage('Copied to clipboard');
  }

  async function handleCopyContent() {
    if (!selectedPaste) {
      return;
    }

    await navigator.clipboard.writeText(selectedPaste.content);
    setToastMessage('Copied to clipboard');
  }

  function handleDeletePaste() {
    if (!selectedPaste) {
      return;
    }

    setPastes((currentPastes) => currentPastes.filter((paste) => paste.id !== selectedPaste.id));
    setSelectedPasteId(null);
    setToastMessage('Paste deleted');
  }

  function goToPreviousPage() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goToNextPage() {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  }

  return (
    <div className="app-shell">
      <main className="app-layout">
        <Hero onCreatePaste={openCreateModal} />

        <section className="stats-grid" aria-label="Platform controls">
          <article className="stat-card">
            <p className="section-label">Security</p>
            <h2>BCrypt passwords</h2>
            <p className="muted">Private pastes stay limited to the owner. Passworded pastes require verification.</p>
          </article>
<article className="stat-card">
            <p className="section-label">Access</p>
            <h2>USER / ADMIN routes</h2>
            <p className="muted">Separate controls for ownership, moderation, analytics, and user management.</p>
          </article>
        </section>

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
              <span>
                Page {currentPage} of {totalPages}
              </span>
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
          <p>Kirovakan</p>
        </div>
        <div className="footer-links">
          <a href="#login">Login</a>
          <a href="#signup">Sign Up</a>
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

      <div className="toast-region" aria-live="polite">
        {toastMessage ? <div className="toast">{toastMessage}</div> : null}
      </div>
    </div>
  );
}

export default App;

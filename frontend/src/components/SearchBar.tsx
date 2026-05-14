import { ChangeEvent } from 'react';
import { PasteLanguage, SortOption } from '../types';
import { languageOptions } from '../utils/pastes';

interface SearchBarProps {
  searchQuery: string;
  selectedLanguage: PasteLanguage | 'all';
  selectedTag: string;
  selectedAuthor: string;
  sortOption: SortOption;
  authors: string[];
  tags: string[];
  onSearchChange: (value: string) => void;
  onLanguageChange: (value: PasteLanguage | 'all') => void;
  onTagChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onSortChange: (value: SortOption) => void;
}

function SearchBar({
  searchQuery,
  selectedLanguage,
  selectedTag,
  selectedAuthor,
  sortOption,
  authors,
  tags,
  onSearchChange,
  onLanguageChange,
  onTagChange,
  onAuthorChange,
  onSortChange,
}: SearchBarProps) {
  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    onSearchChange(event.target.value);
  }

  function handleLanguageChange(event: ChangeEvent<HTMLSelectElement>) {
    onLanguageChange(event.target.value as PasteLanguage | 'all');
  }

  function handleTagChange(event: ChangeEvent<HTMLSelectElement>) {
    onTagChange(event.target.value);
  }

  function handleAuthorChange(event: ChangeEvent<HTMLSelectElement>) {
    onAuthorChange(event.target.value);
  }

  function handleSortChange(event: ChangeEvent<HTMLSelectElement>) {
    onSortChange(event.target.value as SortOption);
  }

  return (
    <section className="panel" aria-labelledby="search-title">
      <div className="panel-header">
        <div>
          <p className="section-label">Search your snippets</p>
          <h2 id="search-title">Recent public pastes</h2>
        </div>
      </div>

      <form className="search-grid" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="field">
          <span>Keyword</span>
          <input
            aria-label="Search pastes by keyword"
            type="search"
            value={searchQuery}
            placeholder="Search title, tags, or content"
            onChange={handleSearchChange}
          />
        </label>

        <label className="field">
          <span>Language</span>
          <select value={selectedLanguage} onChange={handleLanguageChange}>
            <option value="all">All languages</option>
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Tag</span>
          <select value={selectedTag} onChange={handleTagChange}>
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Author</span>
          <select value={selectedAuthor} onChange={handleAuthorChange}>
            <option value="">All authors</option>
            {authors.map((author) => (
              <option key={author} value={author}>
                {author}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Sort</span>
          <select value={sortOption} onChange={handleSortChange}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="most-viewed">Most viewed</option>
          </select>
        </label>
      </form>
    </section>
  );
}

export default SearchBar;

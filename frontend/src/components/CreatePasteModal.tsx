import { ChangeEvent, FormEvent } from 'react';
import { FieldErrors } from '../api';
import { CreatePasteFormValues, PasteVisibility } from '../types';
import { expiryOptions, languageOptions } from '../utils/pastes';

interface CreatePasteModalProps {
  isOpen: boolean;
  values: CreatePasteFormValues;
  errorMessage: string;
  fieldErrors: FieldErrors;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (values: CreatePasteFormValues) => void;
}

function CreatePasteModal({
  isOpen,
  values,
  errorMessage,
  fieldErrors,
  isSubmitting,
  onClose,
  onSubmit,
  onChange,
}: CreatePasteModalProps) {
  if (!isOpen) {
    return null;
  }

  function updateField<Key extends keyof CreatePasteFormValues>(
    field: Key,
    value: CreatePasteFormValues[Key]
  ) {
    onChange({ ...values, [field]: value });
  }

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    updateField(name as keyof CreatePasteFormValues, value);
  }

  function handleVisibilityChange(event: ChangeEvent<HTMLInputElement>) {
    updateField('visibility', event.target.value as PasteVisibility);
  }

  function handleBurnAfterReadChange(event: ChangeEvent<HTMLInputElement>) {
    updateField('burnAfterRead', event.target.checked);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  const fieldError = (name: string) => fieldErrors[name];

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-paste-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="section-label">Create a paste</p>
            <h2 id="create-paste-title">Share in three clicks</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close create paste dialog" onClick={onClose}>
            Close
          </button>
        </div>

        <form className="create-form" onSubmit={handleSubmit} noValidate>
          <label className="field field-full">
            <span>Title</span>
            <input
              name="title"
              type="text"
              value={values.title}
              placeholder="Paste title"
              maxLength={255}
              aria-invalid={!!fieldError('title')}
              aria-describedby={fieldError('title') ? 'create-title-error' : undefined}
              onChange={handleInputChange}
            />
            {fieldError('title') && (
              <span id="create-title-error" className="field-error" aria-live="polite">
                {fieldError('title')}
              </span>
            )}
          </label>

          <label className="field field-full">
            <span>Content</span>
            <textarea
              name="content"
              rows={14}
              value={values.content}
              placeholder="Paste code, logs, or notes"
              aria-invalid={!!fieldError('content')}
              aria-describedby={fieldError('content') ? 'create-content-error' : undefined}
              onChange={handleInputChange}
            />
            {fieldError('content') && (
              <span id="create-content-error" className="field-error" aria-live="polite">
                {fieldError('content')}
              </span>
            )}
          </label>

          <label className="field">
            <span>Language</span>
            <select name="language" value={values.language} onChange={handleInputChange}>
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Expiry</span>
            <select
              name="expiresIn"
              value={values.expiresIn}
              onChange={handleInputChange}
              aria-invalid={!!fieldError('expiresAt')}
              aria-describedby={fieldError('expiresAt') ? 'create-expires-error' : undefined}
            >
              {expiryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {fieldError('expiresAt') && (
              <span id="create-expires-error" className="field-error" aria-live="polite">
                {fieldError('expiresAt')}
              </span>
            )}
          </label>

          <label className="field">
            <span>Tags</span>
            <input
              name="tags"
              type="text"
              value={values.tags}
              placeholder="docker, auth, logs"
              aria-invalid={!!fieldError('tags')}
              aria-describedby={fieldError('tags') ? 'create-tags-error' : undefined}
              onChange={handleInputChange}
            />
            {fieldError('tags') && (
              <span id="create-tags-error" className="field-error" aria-live="polite">
                {fieldError('tags')}
              </span>
            )}
          </label>

          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              value={values.password}
              placeholder="Optional"
              maxLength={72}
              aria-invalid={!!fieldError('password')}
              aria-describedby={fieldError('password') ? 'create-password-error' : undefined}
              onChange={handleInputChange}
            />
            {fieldError('password') && (
              <span id="create-password-error" className="field-error" aria-live="polite">
                {fieldError('password')}
              </span>
            )}
          </label>

          <fieldset className="toggle-group">
            <legend>Visibility</legend>
            <label>
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={values.visibility === 'public'}
                onChange={handleVisibilityChange}
              />
              <span>Public</span>
            </label>
            <label>
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={values.visibility === 'private'}
                onChange={handleVisibilityChange}
              />
              <span>Private</span>
            </label>
          </fieldset>

          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={values.burnAfterRead}
              onChange={handleBurnAfterReadChange}
            />
            <span>Burn after first read</span>
          </label>

          {errorMessage ? (
            <p className="error-text field-full" role="alert" aria-live="assertive">
              {errorMessage}
            </p>
          ) : null}

          <div className="modal-actions field-full">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Share'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CreatePasteModal;

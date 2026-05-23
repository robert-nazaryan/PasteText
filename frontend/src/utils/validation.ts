import { CreatePasteFormValues } from '../types';
import { FieldErrors } from '../api/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LIMITS = {
  emailMax: 254,
  authPasswordMin: 6,
  authPasswordMax: 72,
  pastePasswordMax: 72,
  pasteTitleMax: 255,
  pasteContentMax: 1_000_000,
};

export function validateAuth(
  email: string,
  password: string,
  mode: 'login' | 'register'
): FieldErrors {
  const errors: FieldErrors = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = 'Must be a valid email address';
  } else if (trimmedEmail.length > LIMITS.emailMax) {
    errors.email = `Email must be at most ${LIMITS.emailMax} characters`;
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (
    mode === 'register' &&
    (password.length < LIMITS.authPasswordMin || password.length > LIMITS.authPasswordMax)
  ) {
    errors.password = `Password must be between ${LIMITS.authPasswordMin} and ${LIMITS.authPasswordMax} characters`;
  }

  return errors;
}

export function validateCreatePaste(values: CreatePasteFormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.content.trim()) {
    errors.content = 'Content is required';
  } else if (values.content.length > LIMITS.pasteContentMax) {
    errors.content = `Content must be at most ${LIMITS.pasteContentMax.toLocaleString()} characters`;
  }

  if (values.title.length > LIMITS.pasteTitleMax) {
    errors.title = `Title must be at most ${LIMITS.pasteTitleMax} characters`;
  }

  if (values.password && values.password.length > LIMITS.pastePasswordMax) {
    errors.password = `Password must be at most ${LIMITS.pastePasswordMax} characters`;
  }

  return errors;
}

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

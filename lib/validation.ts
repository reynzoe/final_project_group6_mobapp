const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function validateNumericField(
  label: string,
  value?: string | null,
  minDigits = 1,
  maxDigits = 2
) {
  const trimmed = normalizeText(value);
  if (!trimmed) return `${label} is required.`;
  if (!/^\d+$/.test(trimmed)) return `${label} must be numeric.`;
  if (trimmed.length < minDigits || trimmed.length > maxDigits) {
    return `${label} must be ${minDigits}-${maxDigits} digits.`;
  }
  return null;
}

export function validateRequiredText(label: string, value?: string | null) {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return `${label} is required.`;
  }

  if (trimmed.length < 2) {
    return `${label} must be at least 2 characters.`;
  }

  return null;
}

export function validateEmail(value?: string | null) {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return 'Email is required.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return 'Enter a valid email address.';
  }

  return null;
}

export function validatePassword(value?: string | null, allowEmpty = false) {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return allowEmpty ? null : 'Password is required.';
  }

  if (trimmed.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  return null;
}

export function validateQuantity(value?: string | null) {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return 'Quantity is required.';
  }

  const quantity = Number(trimmed);

  if (!Number.isInteger(quantity) || quantity < 0) {
    return 'Quantity must be a whole number greater than or equal to 0.';
  }

  return null;
}
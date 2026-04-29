export function validateRequiredText(label: string, value: string) {
  if (!value.trim()) {
    return `${label} is required.`;
  }

  if (value.trim().length < 2) {
    return `${label} must be at least 2 characters.`;
  }

  return null;
}

export function validateEmail(value: string) {
  if (!value.trim()) {
    return 'Email is required.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) {
    return 'Enter a valid email address.';
  }

  return null;
}

export function validatePassword(value: string, allowEmpty = false) {
  if (!value.trim()) {
    return allowEmpty ? null : 'Password is required.';
  }

  if (value.trim().length < 8) {
    return 'Password must be at least 8 characters.';
  }

  return null;
}

export function validateQuantity(value: string) {
  if (!value.trim()) {
    return 'Quantity is required.';
  }

  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity < 0) {
    return 'Quantity must be a whole number greater than or equal to 0.';
  }

  return null;
}

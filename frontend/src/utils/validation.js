/**
 * Validate password strength against policy:
 * - Minimum 8 characters
 * - Maximum 12 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 number (0-9)
 * - At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
 * 
 * Returns { isValid: boolean, message: string }
 */
export function validatePassword(password) {
  if (!password) {
    return { isValid: false, message: 'Password is required.' };
  }
  if (password.length < 8 || password.length > 12) {
    return { isValid: false, message: 'Password must be between 8 and 12 characters.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/\d/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number.' };
  }
  const specialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  if (![...password].some(char => specialChars.includes(char))) {
    return { isValid: false, message: 'Password must contain at least one special character.' };
  }
  return { isValid: true, message: 'Password meets all security requirements.' };
}

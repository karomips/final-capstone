/**
 * Philippine Phone Number Formatter
 * Automatically formats phone numbers with +63 prefix and masks input
 * Format: +63 XXX XXX XXXX (11 digits total including country code)
 */

/**
 * Format phone number input with +63 prefix
 * Accepts inputs like:
 * - 09123456789 (formats to +63 921 234 5678)
 * - 9123456789 (formats to +63 921 234 5678)
 * - +639123456789 (formats to +63 921 234 5678)
 * - Partial input while typing
 * 
 * @param {string} input - Raw phone number input
 * @returns {string} Formatted phone number with +63 prefix
 */
export const formatPhoneNumber = (input) => {
  if (!input) return '';

  // Remove all non-digit characters except leading +
  let digits = input.replace(/\D/g, '');

  // Remove leading 0 if present (local format)
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // Remove leading 63 if present (country code without +)
  if (digits.startsWith('63')) {
    digits = digits.substring(2);
  }

  // Limit to 10 digits (Philippine mobile number without country code)
  digits = digits.substring(0, 10);

  // Format: +63 XXX XXX XXXX
  if (digits.length === 0) {
    return '';
  } else if (digits.length <= 3) {
    return `+63 ${digits}`;
  } else if (digits.length <= 6) {
    return `+63 ${digits.substring(0, 3)} ${digits.substring(3)}`;
  } else {
    return `+63 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
  }
};

/**
 * Extract raw digits from formatted phone number
 * Returns only the 10 digit local number (without +63)
 * 
 * @param {string} formattedNumber - Formatted phone number (e.g., "+63 921 234 5678")
 * @returns {string} Raw 10-digit number without +63
 */
export const extractPhoneDigits = (formattedNumber) => {
  if (!formattedNumber) return '';
  
  // Remove all non-digit characters
  let digits = formattedNumber.replace(/\D/g, '');
  
  // Remove leading 63 if present
  if (digits.startsWith('63')) {
    digits = digits.substring(2);
  }
  
  return digits.substring(0, 10);
};

/**
 * Get full phone number with +63 prefix for validation/submission
 * 
 * @param {string} formattedNumber - Formatted phone number (e.g., "+63 921 234 5678")
 * @returns {string} Full number with +63 (e.g., "+639212345678")
 */
export const getFullPhoneNumber = (formattedNumber) => {
  const digits = extractPhoneDigits(formattedNumber);
  return digits ? `+63${digits}` : '';
};

/**
 * Validate Philippine phone number format
 * 
 * @param {string} phoneNumber - Phone number to validate (with or without +63)
 * @returns {boolean} True if valid Philippine phone number
 */
export const isValidPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return false;
  
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Should be 10 digits (without +63) or 12 digits (with +63)
  // Starts with 9 (first digit after +63 in PH)
  if (digits.length === 10 && digits.startsWith('9')) {
    return true;
  }
  if (digits.length === 12 && digits.startsWith('639')) {
    return true;
  }
  
  return false;
};

export default {
  formatPhoneNumber,
  extractPhoneDigits,
  getFullPhoneNumber,
  isValidPhoneNumber
};

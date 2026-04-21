# Philippine Phone Number Masking Implementation Guide

## Overview
The system now automatically formats and masks Philippine phone numbers with the +63 prefix as users type.

## Features

### Auto-Formatting
As users type phone numbers, the input is automatically formatted to: **+63 9XX XXX XXXX**

**Examples:**
- User types: `09123456789` → Displays: `+63 921 234 5678`
- User types: `9123456789` → Displays: `+63 921 234 5678`
- User types: `+639123456789` → Displays: `+63 921 234 5678`
- User types partial: `091234` → Displays: `+63 912 34`

### Input Flexibility
The formatter accepts multiple input formats:
- ✅ `09XX XXX XXXX` (local format with 0)
- ✅ `9XX XXX XXXX` (local format without 0)
- ✅ `+639XX XXX XXXX` (international format)
- ✅ Any mixture with spaces or special characters (spaces are ignored)

### Validation
Phone numbers are validated as:
- Exactly 10 digits (local format) starting with 9
- Exactly 12 digits (with +63) starting with 639

**Valid Examples:**
- `+63 921 234 5678`
- `+639212345678`
- `09212345678`

## Where It's Implemented

### Files Created
- `frontend/src/utils/phoneNumberFormatter.js` - Core utility with all formatting functions

### Files Updated

#### 1. **Signup.js** - Registration form
- Student Phone Number field
- Parent Phone Number field
- Both fields now auto-format with +63 prefix
- Placeholder shows: `+63 9XX XXX XXXX`

#### 2. **Profile.js** - User profile edit
- Phone Number field in edit mode
- Auto-formats with +63 prefix
- Placeholder shows: `+63 9XX XXX XXXX`

## Utility Functions

### `formatPhoneNumber(input)` 
Formats raw input with +63 prefix and spacing
```javascript
import { formatPhoneNumber } from '../../utils/phoneNumberFormatter';

setPhoneNumber(formatPhoneNumber(e.target.value));
// Returns: "+63 921 234 5678"
```

### `isValidPhoneNumber(phoneNumber)`
Validates if phone number is in correct format
```javascript
import { isValidPhoneNumber } from '../../utils/phoneNumberFormatter';

if (!isValidPhoneNumber(formData.phoneNumber)) {
  setError('Invalid phone number');
}
```

### `extractPhoneDigits(formattedNumber)`
Extracts just the 10-digit local number without +63
```javascript
import { extractPhoneDigits } from '../../utils/phoneNumberFormatter';

const localNumber = extractPhoneDigits("+63 921 234 5678");
// Returns: "9212345678"
```

### `getFullPhoneNumber(formattedNumber)`
Returns full number with +63 prefix (no spaces)
```javascript
import { getFullPhoneNumber } from '../../utils/phoneNumberFormatter';

const fullNumber = getFullPhoneNumber("+63 921 234 5678");
// Returns: "+639212345678"
```

## User Experience

### Registration (Signup)
1. User opens registration form
2. Clicks on "Student Phone Number" field
3. Starts typing: `091234...`
4. Field auto-displays: `+63 912 34...`
5. User completes typing: `09123456789`
6. Field shows: `+63 921 234 5678`
7. Form validates and accepts the number

### Profile Edit
1. User clicks edit profile
2. Phone Number field shows current number (if any)
3. User modifies the number
4. Field auto-formats as they type
5. User submits - phone is validated and saved with +63 format

## Technical Details

### Formatting Logic
- Removes all non-digit characters
- Strips leading 0 (converts local to international base)
- Removes duplicate +63 prefix if already present
- Limits to 10 digits maximum
- Adds +63 prefix and formats with spaces: `+63 9XX XXX XXXX`

### Validation Logic
- Checks total digit length (10 without +63, or 12 with +63)
- Ensures starts with 9 (local) or 639 (international)
- Rejects empty or incomplete numbers

## Important Notes

1. **Spaces are cosmetic** - Saved phone number won't include spaces
2. **+63 is automatic** - Users don't need to type it
3. **Local numbers work** - Users can type 09 or 9, both work
4. **Validation happens on submit** - Real-time feedback via placeholder and error messages
5. **Parent phone is optional** - But when provided, must be valid format

## Testing Scenarios

### Valid Inputs
```
Input: 09123456789
Output Display: +63 921 234 5678
Stored: +639212345678 (for validation/SMS)

Input: 9123456789  
Output Display: +63 921 234 5678
Stored: +639212345678

Input: +639123456789
Output Display: +63 921 234 5678
Stored: +639212345678
```

### Invalid Inputs
```
Input: 08123456789 (starts with 8)
Validation: ❌ Invalid

Input: 091234567 (too short)
Validation: ❌ Invalid (less than 10 digits)

Input: 091234567890123 (too long)
Validation: ❌ Invalid (excess digits trimmed)
```

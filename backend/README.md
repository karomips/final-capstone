# Backend API

Node.js/Express backend with Firebase Admin SDK.

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment:
   - `.env` file is already configured
   - Service account key is in `config/serviceAccountKey.json`

3. Start the server:
```bash
npm run dev    # Development with auto-reload
npm start      # Production
```

Server will run on: http://localhost:5000

## Email Verification Setup

Add these variables to `backend/.env` for email verification codes:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-app-password
SMTP_FROM_EMAIL=your-email@example.com
APP_NAME=Easy Drive Driving School
```

Notes:
- Use an app password if your provider requires it.
- Verification emails will fail until all SMTP values are set.

## API Endpoints

### Test
- `GET /api` - Test if API is running

### Users
- `GET /api/users/:uid` - Get user profile by UID
- `POST /api/users/:uid` - Create/Update user profile

### Auth (Email Verification)
- `POST /api/auth/send-verification-code` - Send a 6-digit code to the user's email
- `POST /api/auth/verify-verification-code` - Verify the submitted code
- `GET /api/auth/verification-status?email=...` - Check if an email is verified for signup
- `POST /api/auth/consume-verification` - Clear verification state after successful signup

## Technologies
- Express.js
- Firebase Admin SDK
- CORS
- dotenv

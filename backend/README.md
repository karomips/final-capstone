# Backend API

Node.js/Express backend with Appwrite integration.

## Setup

1. Install dependencies:
```bash
cd backend
npm ci
```

2. Configure environment:
   - Copy `.env.example` to `.env`.
   - Add the required Appwrite and service configuration values.

3. Start the server:
```bash
npm run dev    # Development with Node.js watch mode
npm start      # Production
```

Server will run on: http://localhost:5000

## Email Verification Setup

The verification endpoint uses the Brevo transactional email API. Add these variables to `backend/.env`:

```env
BREVO_EMAIL_API_KEY=your_brevo_api_key
SMTP_FROM_EMAIL=your-verified-sender@example.com
APP_NAME=Easy Drive Driving School
```

Notes:
- Create the API key in Brevo under **SMTP & API → API Keys**.
- Verify the sender address/domain in Brevo before using it as `SMTP_FROM_EMAIL`.
- `SMTP_FROM_EMAIL` is the sender address, not an SMTP username.
- Verification emails will fail until both `BREVO_EMAIL_API_KEY` and `SMTP_FROM_EMAIL` are set.

## Event-Driven Approval Emails

To send a welcome email when admin approves a user, use the Appwrite Function scaffold in:

- `appwrite-functions/user-approved-email`

Setup guide:

- `EVENT_DRIVEN_APPROVAL_EMAIL_SETUP.md`

## API Endpoints

### Test
- `GET /api` - Test if API is running

### Users
- `GET /api/users/:uid` - Get user profile by UID
- `POST /api/users/:uid` - Create/Update user profile
- `GET /api/users/me/instructor-assignment` - Get the signed-in user's selected instructor
- `PUT /api/users/me/instructor-assignment` - Save or change the signed-in user's selected instructor
- `PUT /api/instructors/me/profile` - Resolve or create the signed-in instructor's profile
- `GET /api/instructors/me/assigned-users` - List users assigned to the signed-in instructor

The instructor-assignment routes require `Authorization: Bearer <Appwrite JWT>`. The backend resolves the account from that JWT and never accepts a user ID or instructor ID as an authorization identity. The profile endpoint creates a minimal instructor record if the authenticated instructor has no matching record. New admin-created instructor records use the Auth account ID as their document ID. The assigned-users API needs a private `user-instructor-assignments` collection with `userId` and `instructorId` String attributes (255 characters), `createdAt` and `updatedAt` String attributes (50 characters), and an ascending index on `instructorId`. From this directory, run `npm run setup:assigned-users` to create the collection and missing schema. The setup keeps the collection private with no client permissions. The existing `instructors` collection also needs its `email` attribute and an index on `email`; email remains the fallback link for older instructor records.

### Auth (Email Verification)
- `POST /api/auth/send-verification-code` - Send a 6-digit code to the user's email
- `POST /api/auth/verify-verification-code` - Verify the submitted code
- `GET /api/auth/verification-status?email=...` - Check if an email is verified for signup
- `POST /api/auth/consume-verification` - Clear verification state after successful signup

## Technologies
- Express.js
- Appwrite Node.js SDK
- CORS
- dotenv

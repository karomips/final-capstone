# Event-Driven Admin Approval Email Setup

This project now includes an Appwrite Function scaffold that sends a welcome email when a user is approved.

## Files Added

- `appwrite-functions/user-approved-email/src/main.js`
- `appwrite-functions/user-approved-email/package.json`
- `appwrite-functions/user-approved-email/README.md`

## Important Code Update

New user accounts are now pending by default (except admin email):

- `frontend/src/contexts/AuthContext.js`
- `approved` is now set to `email === 'admin@gmail.com'`

## Deploy Steps

1. In Appwrite Console, create a new function.
2. Runtime: Node.js.
3. Entrypoint: `src/main.js`.
4. Upload the folder `appwrite-functions/user-approved-email`.
5. Set environment variables from function README.
6. Add event trigger:
   - `databases.main-database.collections.users.documents.*.update`
7. Redeploy function.

## Collection Attributes (Users)

Ensure these exist:

- `approved` (Boolean, default false)
- `welcomeEmailSent` (Boolean, default false)
- `welcomeEmailSentAt` (String, optional)

## Test Plan

1. Register new user (should be pending).
2. Admin opens student management and clicks Approve.
3. Confirm function execution logs in Appwrite.
4. Confirm user receives welcome email.
5. Confirm document now has `welcomeEmailSent = true`.

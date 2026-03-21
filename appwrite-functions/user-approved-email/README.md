# User Approval Welcome Email Function

This Appwrite Function sends a welcome email when a user document becomes approved.

## What It Does

- Trigger: user document update event
- Condition: `approved === true` and `welcomeEmailSent !== true`
- Action:
  1. Sends welcome email via SMTP
  2. Marks the user document with:
     - `welcomeEmailSent: true`
     - `welcomeEmailSentAt: ISO timestamp`

## Required User Collection Attributes

Add these attributes to `users` collection in Appwrite:

- `approved` (Boolean, required, default: `false`)
- `welcomeEmailSent` (Boolean, required, default: `false`)
- `welcomeEmailSentAt` (String, size 50, required: `false`)

## Function Configuration

- Runtime: Node.js
- Entrypoint: `src/main.js`
- Execute as: Appwrite API key with permission to update the users collection

## Environment Variables

Set these in the Appwrite Function settings:

- `APPWRITE_FUNCTION_ENDPOINT` = `https://sgp.cloud.appwrite.io/v1`
- `APPWRITE_FUNCTION_PROJECT_ID` = `69ac803a001c47a4f8c3`
- `APPWRITE_FUNCTION_API_KEY` = (server API key with Databases read/update)
- `APPWRITE_DATABASE_ID` = `main-database`
- `APPWRITE_USERS_COLLECTION_ID` = `users`
- `SMTP_HOST` = your SMTP host (example: `smtp.gmail.com`)
- `SMTP_PORT` = your SMTP port (`587` or `465`)
- `SMTP_USER` = SMTP username
- `SMTP_PASS` = SMTP password/app password
- `SMTP_FROM_EMAIL` = sender email
- `APP_NAME` = optional brand name shown in email

## Event Trigger

Add this event to the function:

- `databases.main-database.collections.users.documents.*.update`

## Admin Approval Flow

When admin approves a user in student management:

1. `approved` is changed to `true`
2. Function receives update event
3. Welcome email is sent once
4. User document gets `welcomeEmailSent = true`

## Notes

- If schema does not include `welcomeEmailSent` fields yet, email can still send, but the function cannot mark sent status.
- Add those attributes before production to prevent duplicate sends.

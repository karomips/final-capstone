const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables FIRST before requiring other modules
dotenv.config();

const {
  databases,
  users,
  databaseId,
  usersCollectionId,
  instructorsCollectionId,
  instructorAssignmentsCollectionId,
  appointmentsCollectionId,
  bookingsCollectionId,
  endpoint,
  projectId
} = require('./config/appwrite');
const { Client: AppwriteClient, Account, Query } = require('node-appwrite');
const smsService = require('./services/smsService');
const { startAutomaticSMSScheduler } = require('./services/smsScheduler');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.BREVO_EMAIL_API_KEY || !process.env.SMTP_FROM_EMAIL) {
  console.warn(
    'Email verification is disabled: set BREVO_EMAIL_API_KEY and SMTP_FROM_EMAIL in backend/.env.'
  );
}

const getAuthenticatedAccount = async (req) => {
  const authorization = String(req.headers.authorization || '');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error('Sign in to continue.');
    error.status = 401;
    throw error;
  }

  const sessionClient = new AppwriteClient()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setJWT(match[1]);
  const account = new Account(sessionClient);
  return account.get();
};

const getAccountUserDocument = async (authAccount) => {
  try {
    return await databases.getDocument(databaseId, usersCollectionId, authAccount.$id);
  } catch (error) {
    if (Number(error.code) !== 404 || !authAccount.email) throw error;

    const response = await databases.listDocuments(databaseId, usersCollectionId, [
      Query.equal('email', authAccount.email),
      Query.limit(10)
    ]);
    const normalizedEmail = String(authAccount.email).trim().toLowerCase();
    const userDocument = response.documents.find(
      (document) => String(document.email || '').trim().toLowerCase() === normalizedEmail
    );
    if (!userDocument) {
      const notFound = new Error('Your user profile could not be found.');
      notFound.status = 404;
      throw notFound;
    }
    return userDocument;
  }
};

const requireAccountRole = async (authAccount, allowedRole) => {
  const userDocument = await getAccountUserDocument(authAccount);
  if (userDocument.role !== allowedRole) {
    const error = new Error('You are not allowed to perform this action.');
    error.status = 403;
    throw error;
  }
  return userDocument;
};

const getInstructorProfileForAccount = async (authAccount, accountUserDocument, createIfMissing = false) => {
  const accountId = String(authAccount.$id || '').trim();

  // Profiles created by the admin UI may use a separate document ID. New/self-provisioned
  // profiles use the authenticated account ID, which remains a stable identity link.
  if (accountId) {
    try {
      return await databases.getDocument(databaseId, instructorsCollectionId, accountId);
    } catch (error) {
      if (Number(error.code) !== 404) throw error;
    }
  }

  const emails = [...new Set([authAccount.email, accountUserDocument?.email]
    .map((email) => String(email || '').trim())
    .filter(Boolean))];
  const normalizedEmails = new Set(emails.map((email) => email.toLowerCase()));

  for (const email of emails) {
    const response = await databases.listDocuments(databaseId, instructorsCollectionId, [
      Query.equal('email', email),
      Query.limit(100)
    ]);
    const match = response.documents.find(
      (document) => normalizedEmails.has(String(document.email || '').trim().toLowerCase())
    );
    if (match) return match;
  }

  // Email equality is case-sensitive in Appwrite. Scan all pages so profiles with older
  // capitalization or whitespace still resolve to the authenticated account.
  let offset = 0;
  let total = 0;
  do {
    const response = await databases.listDocuments(databaseId, instructorsCollectionId, [
      Query.limit(100),
      Query.offset(offset)
    ]);
    const match = response.documents.find(
      (document) => normalizedEmails.has(String(document.email || '').trim().toLowerCase())
    );
    if (match) return match;

    total = response.total;
    offset += response.documents.length;
    if (response.documents.length === 0) break;
  } while (offset < total);

  if (!createIfMissing) {
    const error = new Error('Your instructor profile could not be found.');
    error.status = 404;
    throw error;
  }

  const email = emails[0] || '';
  if (!accountId || !email) {
    const error = new Error('Your instructor account must have an email address before a profile can be created.');
    error.status = 400;
    throw error;
  }

  const name = String(accountUserDocument?.name || authAccount.name || email.split('@')[0] || 'Instructor').trim();
  try {
    return await databases.createDocument(databaseId, instructorsCollectionId, accountId, {
      name,
      email,
      certifications: 'Not provided',
      lessonType: 'practical',
      transmission: 'MT',
      availability: 'available',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    // A simultaneous dashboard request may have created this same profile first.
    if (Number(error.code) === 409) {
      return databases.getDocument(databaseId, instructorsCollectionId, accountId);
    }
    throw error;
  }
};

const handleAssignmentApiError = (res, error, message) => {
  const code = Number(error.code);
  const status = Number(error.status) || (code === 401 || code === 403 || code === 404 ? code : 500);
  if (status >= 500) console.error(message, error);
  return res.status(status).json({
    error: status === 500 ? message : error.message
  });
};

// Middleware
app.use(cors({
  origin: [
    'https://driveease-beta.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Explicit OPTIONS handler for preflight requests
app.options('*', cors({
  origin: [
    'https://driveease-beta.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const verificationCodes = new Map();
const CODE_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

const maskEmail = (email) => {
  const [local = '', domain = ''] = String(email || '').split('@');
  if (!local || !domain) return '';
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
};

// Send verification code email using Brevo REST API
const sendVerificationCodeEmail = async (email, code) => {
  const apiKey = process.env.BREVO_EMAIL_API_KEY; // Brevo Email API key
  const fromEmail = process.env.SMTP_FROM_EMAIL;
  const appName = process.env.APP_NAME || 'Easy Drive Driving School';

  if (!apiKey) {
    throw new Error('BREVO_EMAIL_API_KEY is not configured.');
  }

  if (!fromEmail) {
    throw new Error('SMTP_FROM_EMAIL is not configured.');
  }

  console.log(`Sending verification code to ${email} via Brevo API...`);

  const emailData = {
    sender: {
      email: fromEmail,
      name: appName
    },
    to: [
      {
        email: email
      }
    ],
    subject: `${appName} Verification Code`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin-bottom: 8px;">Email Verification</h2>
        <p>Use this verification code to complete your registration:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0; color: #17417a;">${code}</p>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `
  };

  try {
    console.log('Sending email via Brevo API...');
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Brevo API error: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('✓ Email sent successfully via Brevo API:', result.messageId);
    return result;
  } catch (error) {
    console.error('Brevo API error:', error);
    throw error;
  }
};

const withTimeout = (promise, timeoutMs, timeoutMessage) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    })
  ]);
};

const classifyVerificationSendError = (error) => {
  const message = String(error?.message || 'Failed to send verification code');
  const code = String(error?.code || '').toUpperCase();

  if (message.includes('not configured')) {
    return {
      status: 500,
      error: 'Email service is not configured on the server.',
      reason: 'email_not_configured'
    };
  }

  if (message.includes('timed out') || code === 'ETIMEDOUT') {
    return {
      status: 504,
      error: 'Email service timed out. Please try again.',
      reason: 'email_timeout'
    };
  }

  if (code === 'EAUTH' || message.includes('AUTHENTICATION FAILED')) {
    return {
      status: 401,
      error: 'Email authentication failed. Please check SMTP credentials.',
      reason: 'email_auth_failed'
    };
  }

  if (code === 'ECONNREFUSED' || message.includes('connect')) {
    return {
      status: 502,
      error: 'Cannot connect to email service. Please try again later.',
      reason: 'email_connection_failed'
    };
  }

  return {
    status: 500,
    error: 'Failed to send verification code. Please try again.',
    reason: 'email_unknown_error'
  };
};

const cleanupExpiredVerificationCodes = () => {
  const now = Date.now();
  for (const [email, data] of verificationCodes.entries()) {
    if (data.expiresAt <= now) {
      verificationCodes.delete(email);
    }
  }
};

setInterval(cleanupExpiredVerificationCodes, 5 * 60 * 1000);

// Send email verification code for signup
app.post('/api/auth/send-verification-code', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const now = Date.now();
    const existing = verificationCodes.get(email);
    if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
      const waitMs = RESEND_COOLDOWN_MS - (now - existing.lastSentAt);
      return res.status(429).json({
        error: 'Please wait before requesting another code',
        retryAfterSeconds: Math.ceil(waitMs / 1000)
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await withTimeout(
      sendVerificationCodeEmail(email, code),
      60000,
      'Email service timed out. Please try again in a moment.'
    );

    verificationCodes.set(email, {
      code,
      expiresAt: now + CODE_EXPIRY_MS,
      verified: false,
      lastSentAt: now,
      attempts: 0
    });

    return res.json({
      success: true,
      message: `Verification code sent to ${maskEmail(email)}.`,
      deliveryChannel: 'email',
      recipientEmail: email,
      recipientEmailMasked: maskEmail(email),
      expiresInSeconds: Math.floor(CODE_EXPIRY_MS / 1000)
    });
  } catch (error) {
    const classified = classifyVerificationSendError(error);
    console.error('Error sending verification code:', {
      message: error?.message,
      code: error?.code,
      command: error?.command,
      responseCode: error?.responseCode,
      reason: classified.reason
    });

    return res.status(classified.status).json({
      error: classified.error,
      reason: classified.reason
    });
  }
});

// Verify email code for signup
app.post('/api/auth/verify-verification-code', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const record = verificationCodes.get(email);
    if (!record) {
      return res.status(400).json({ error: 'No verification code found for this email. Please request a new code.' });
    }

    if (record.expiresAt <= Date.now()) {
      verificationCodes.delete(email);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      verificationCodes.delete(email);
      return res.status(429).json({ error: 'Too many failed attempts. Please request a new code.' });
    }

    if (record.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    record.verified = true;
    verificationCodes.set(email, record);

    return res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying code:', error);
    return res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Check if email is verified before signup
app.get('/api/auth/verification-status', (req, res) => {
  const email = String(req.query?.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const record = verificationCodes.get(email);
  if (!record || record.expiresAt <= Date.now()) {
    return res.json({ verified: false });
  }

  return res.json({ verified: !!record.verified });
});

// Mark verification as consumed after account is created
app.post('/api/auth/consume-verification', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  verificationCodes.delete(email);
  return res.json({ success: true });
});

// Test route
app.get('/api', (req, res) => {
  res.json({ message: 'Backend API is running with Appwrite!' });
});

// A signed-in user may assign only their own account to an existing instructor.
app.put('/api/users/me/instructor-assignment', async (req, res) => {
  try {
    const authAccount = await getAuthenticatedAccount(req);
    const userDocument = await requireAccountRole(authAccount, 'user');
    const instructorId = String(req.body?.instructorId || '').trim();
    if (!instructorId || instructorId.length > 255) {
      return res.status(400).json({ error: 'A valid instructor is required.' });
    }

    const instructor = await databases.getDocument(databaseId, instructorsCollectionId, instructorId);
    let existingAssignment = null;
    try {
      existingAssignment = await databases.getDocument(
        databaseId,
        instructorAssignmentsCollectionId,
        authAccount.$id
      );
    } catch (error) {
      if (Number(error.code) !== 404) throw error;
    }

    const alreadyAssigned = existingAssignment?.instructorId === instructor.$id;
    let assignment = existingAssignment;
    if (!alreadyAssigned) {
      const assignmentData = {
        userId: userDocument.$id,
        instructorId: instructor.$id,
        updatedAt: new Date().toISOString()
      };

      if (existingAssignment) {
        assignment = await databases.updateDocument(
          databaseId,
          instructorAssignmentsCollectionId,
          existingAssignment.$id,
          assignmentData
        );
      } else {
        try {
          assignment = await databases.createDocument(
            databaseId,
            instructorAssignmentsCollectionId,
            authAccount.$id,
            { ...assignmentData, createdAt: new Date().toISOString() }
          );
        } catch (error) {
          // A concurrent duplicate selection can race the initial create. Update the same account record.
          if (Number(error.code) !== 409) throw error;
          assignment = await databases.updateDocument(
            databaseId,
            instructorAssignmentsCollectionId,
            authAccount.$id,
            assignmentData
          );
        }
      }
    }

    return res.json({
      success: true,
      alreadyAssigned,
      assignment: {
        instructorId: assignment.instructorId,
        instructorName: instructor.name
      }
    });
  } catch (error) {
    return handleAssignmentApiError(res, error, 'Failed to save instructor assignment.');
  }
});

// Restore the signed-in user's saved instructor after refresh or a new session.
app.get('/api/users/me/instructor-assignment', async (req, res) => {
  try {
    const authAccount = await getAuthenticatedAccount(req);
    const userDocument = await requireAccountRole(authAccount, 'user');
    let savedAssignment;
    try {
      savedAssignment = await databases.getDocument(
        databaseId,
        instructorAssignmentsCollectionId,
        authAccount.$id
      );
    } catch (error) {
      if (Number(error.code) === 404) return res.json({ assignment: null });
      throw error;
    }

    if (!savedAssignment.instructorId) {
      return res.json({ assignment: null });
    }

    try {
      const instructor = await databases.getDocument(
        databaseId,
        instructorsCollectionId,
        savedAssignment.instructorId
      );
      return res.json({
        assignment: {
          instructorId: instructor.$id,
          instructorName: instructor.name,
          instructorEmail: instructor.email || '',
          profileImageUrl: instructor.imageUrl || ''
        }
      });
    } catch (error) {
      if (Number(error.code) !== 404) throw error;
      return res.json({ assignment: null });
    }
  } catch (error) {
    return handleAssignmentApiError(res, error, 'Failed to load instructor assignment.');
  }
});

// Return only the users assigned to the instructor authenticated by this session.
app.put('/api/instructors/me/profile', async (req, res) => {
  try {
    const authAccount = await getAuthenticatedAccount(req);
    const accountUserDocument = await requireAccountRole(authAccount, 'instructor');
    const instructor = await getInstructorProfileForAccount(authAccount, accountUserDocument, true);
    return res.json({
      instructor: {
        id: instructor.$id,
        name: instructor.name || 'Instructor',
        email: instructor.email || authAccount.email || ''
      }
    });
  } catch (error) {
    return handleAssignmentApiError(res, error, 'Failed to prepare instructor profile.');
  }
});

app.get('/api/instructors/me/assigned-users', async (req, res) => {
  try {
    const authAccount = await getAuthenticatedAccount(req);
    const accountUserDocument = await requireAccountRole(authAccount, 'instructor');
    const instructor = await getInstructorProfileForAccount(authAccount, accountUserDocument);
    const assignments = [];
    const pageSize = 100;
    let offset = 0;
    let total = 0;

    do {
      const response = await databases.listDocuments(databaseId, instructorAssignmentsCollectionId, [
        Query.equal('instructorId', instructor.$id),
        Query.limit(pageSize),
        Query.offset(offset)
      ]);
      total = response.total;
      assignments.push(...response.documents);
      offset += response.documents.length;
      if (response.documents.length === 0) break;
    } while (offset < total && offset > 0);

    const userDocuments = await Promise.all(assignments.map(async (assignment) => {
      try {
        return await databases.getDocument(databaseId, usersCollectionId, assignment.userId);
      } catch (error) {
        if (Number(error.code) === 404) return null;
        throw error;
      }
    }));
    const assignedUsers = userDocuments
      .filter((document) => document && document.role === 'user')
      .map((document) => ({
        id: document.$id,
        name: document.name || 'User',
        email: document.email || '',
        phoneNumber: document.phoneNumber || '',
        profileImageUrl: document.profileImageUrl || '',
        profileImageFileId: document.profileImageFileId || '',
        createdAt: document.createdAt || ''
      }));

    return res.json({ instructorId: instructor.$id, users: assignedUsers });
  } catch (error) {
    return handleAssignmentApiError(res, error, 'Failed to load assigned users.');
  }
});

// Example: Get user data
app.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const userDoc = await databases.getDocument(databaseId, usersCollectionId, uid);
    
    res.json(userDoc);
  } catch (error) {
    if (error.code === 404) {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Example: Create/Update user profile
app.post('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const userData = req.body;
    
    // Try to update existing document, if not exists, create new one
    try {
      const updatedUser = await databases.updateDocument(
        databaseId,
        usersCollectionId,
        uid,
        userData
      );
      res.json({ message: 'User profile updated successfully', user: updatedUser });
    } catch (error) {
      if (error.code === 404) {
        // Document doesn't exist, create it
        const newUser = await databases.createDocument(
          databaseId,
          usersCollectionId,
          uid,
          userData
        );
        res.json({ message: 'User profile created successfully', user: newUser });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SMS Routes

// Send appointment confirmation SMS
app.post('/api/sms/appointment-confirmation', async (req, res) => {
  try {
    const { phoneNumber, appointmentData } = req.body;
    
    if (!phoneNumber || !appointmentData) {
      return res.status(400).json({ error: 'Phone number and appointment data are required' });
    }

    const result = await smsService.sendAppointmentConfirmation(phoneNumber, appointmentData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Send appointment reminder SMS
app.post('/api/sms/appointment-reminder', async (req, res) => {
  try {
    const { phoneNumber, appointmentData } = req.body;
    
    if (!phoneNumber || !appointmentData) {
      return res.status(400).json({ error: 'Phone number and appointment data are required' });
    }

    const result = await smsService.sendAppointmentReminder(phoneNumber, appointmentData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Send appointment cancellation SMS
app.post('/api/sms/appointment-cancellation', async (req, res) => {
  try {
    const { phoneNumber, appointmentData } = req.body;
    
    if (!phoneNumber || !appointmentData) {
      return res.status(400).json({ error: 'Phone number and appointment data are required' });
    }

    const result = await smsService.sendAppointmentCancellation(phoneNumber, appointmentData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Send appointment reschedule SMS
app.post('/api/sms/appointment-reschedule', async (req, res) => {
  try {
    const { phoneNumber, appointmentData } = req.body;
    
    if (!phoneNumber || !appointmentData) {
      return res.status(400).json({ error: 'Phone number and appointment data are required' });
    }

    const result = await smsService.sendAppointmentReschedule(phoneNumber, appointmentData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Send custom SMS
app.post('/api/sms/send', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await smsService.sendSMS(phoneNumber, message);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Check SMS balance - DISABLED (not needed for this application)
// app.get('/api/sms/balance', async (req, res) => {
//   try {
//     const result = await smsService.checkBalance();
//     
//     if (result.success) {
//       res.json(result);
//     } else {
//       res.status(500).json(result);
//     }
//   } catch (error) {
//     console.error('Error checking SMS balance:', error);
//     res.status(500).json({ error: 'Failed to check balance' });
//   }
// });

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`\n🚀 SMS Features Enabled:`);
  console.log(`   ✓ Manual SMS sending via API endpoints`);
  console.log(`   ✓ Automatic reminders 1 hour before appointments`);
  console.log(`   ✓ Checking for reminders every 5 minutes\n`);
  
  // Start automatic SMS scheduler
  startAutomaticSMSScheduler(bookingsCollectionId, usersCollectionId);
});

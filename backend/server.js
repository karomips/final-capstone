const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// Load environment variables FIRST before requiring other modules
dotenv.config();

const { databases, users, databaseId, usersCollectionId, appointmentsCollectionId, bookingsCollectionId } = require('./config/appwrite');
const smsService = require('./services/smsService');
const { startAutomaticSMSScheduler } = require('./services/smsScheduler');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['https://driveease-beta.vercel.app', 'http://localhost:5173'], // Add your Vercel URL here
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

const verificationCodes = new Map();
const CODE_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

const isGmailHost = (host) => /gmail\.com$/i.test(String(host || ''));

const getEmailTransporter = (overridePort) => {
  if (
    !process.env.SMTP_HOST ||
    (!process.env.SMTP_PORT && !overridePort) ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return null;
  }

  // Gmail app passwords are often copied with spaces; normalize before auth.
  const smtpPass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const smtpHost = String(process.env.SMTP_HOST || '').trim();
  const smtpPort = Number(overridePort || process.env.SMTP_PORT);

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    family: 4,
    tls: {
      servername: smtpHost
    },
    auth: {
      user: process.env.SMTP_USER,
      pass: smtpPass
    }
  });
};

const sendVerificationCodeEmail = async (email, code) => {
  const transporter = getEmailTransporter();
  if (!transporter) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL in backend/.env'
    );
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || 'Easy Drive Driving School';
  const smtpHost = String(process.env.SMTP_HOST || '').trim();
  const configuredPort = Number(process.env.SMTP_PORT);
  const fallbackPort = configuredPort === 465 ? 587 : 465;

  const mailOptions = {
    from: `"${appName}" <${fromEmail}>`,
    to: email,
    subject: `${appName} Verification Code`,
    text: `Your verification code is ${code}. This code will expire in 10 minutes.`,
    html: `
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
    await transporter.sendMail(mailOptions);
  } catch (error) {
    if (isGmailHost(smtpHost) && error?.code === 'ETIMEDOUT') {
      const fallbackTransporter = getEmailTransporter(fallbackPort);
      if (!fallbackTransporter) {
        throw error;
      }

      await fallbackTransporter.sendMail(mailOptions);
      return;
    }

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
      15000,
      'Email provider timeout. Please try again in a moment.'
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
      message: 'Verification code sent to your email.',
      deliveryChannel: 'email',
      expiresInSeconds: Math.floor(CODE_EXPIRY_MS / 1000)
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    return res.status(500).json({ error: error.message || 'Failed to send verification code' });
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

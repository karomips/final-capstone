const nodemailer = require('nodemailer');
const sdk = require('node-appwrite');

const REQUIRED_ENV = [
  'APPWRITE_FUNCTION_ENDPOINT',
  'APPWRITE_FUNCTION_PROJECT_ID',
  'APPWRITE_FUNCTION_API_KEY',
  'APPWRITE_DATABASE_ID',
  'APPWRITE_USERS_COLLECTION_ID',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM_EMAIL'
];

function assertEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

function parseJsonBody(req) {
  try {
    return JSON.parse(req.bodyRaw || '{}');
  } catch {
    return {};
  }
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function extractEventPayload(req) {
  const body = parseJsonBody(req);

  if (body && typeof body.payload === 'object' && body.payload !== null) {
    return body.payload;
  }

  if (body && typeof body.data === 'object' && body.data !== null) {
    return body.data;
  }

  return body;
}

function createTransporter() {
  const smtpPort = Number(process.env.SMTP_PORT);
  const smtpPass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');

  return nodemailer.createTransport({
    host: String(process.env.SMTP_HOST || '').trim(),
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: smtpPass
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendWelcomeEmail(toEmail, displayName) {
  const transporter = createTransporter();
  const appName = process.env.APP_NAME || 'Easy Drive Driving School';
  const safeName = escapeHtml(displayName || 'Student');
  const currentYear = new Date().getFullYear();

  await transporter.sendMail({
    from: `"${appName}" <${process.env.SMTP_FROM_EMAIL}>`,
    to: toEmail,
    subject: `You're approved! Welcome to ${appName}`,
    text: [
      `Welcome to ${appName}`,
      '',
      `Hi ${displayName},`,
      '',
      'Great news: your account has been approved by our admin team.',
      'You can now sign in and start booking your driving lessons.',
      '',
      'What you can do next:',
      '- Book your first lesson',
      '- Review your schedule',
      '- Keep track of your progress',
      '',
      'Drive smart and stay safe,',
      `${appName} Team`,
      `© ${currentYear} ${appName}`
    ].join('\n'),
    html: `
      <div style="margin:0; padding:24px; background:#f4f7fb;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px; margin:0 auto; border-collapse:collapse; font-family:'Segoe UI', Tahoma, Arial, sans-serif; color:#102a43;">
          <tr>
            <td style="padding:0;">
              <div style="background:linear-gradient(135deg, #0f766e 0%, #0a4f7a 100%); border-radius:16px 16px 0 0; padding:20px 24px; color:#ffffff;">
                <p style="margin:0; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; opacity:0.9;">Account Approved</p>
                <h1 style="margin:8px 0 0; font-size:28px; line-height:1.2;">Welcome to ${appName}</h1>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff; border:1px solid #d9e2ec; border-top:none; border-radius:0 0 16px 16px; padding:26px 24px 22px;">
              <p style="margin:0 0 12px; font-size:16px;">Hi <strong>${safeName}</strong>,</p>
              <p style="margin:0 0 14px; font-size:15px; line-height:1.65; color:#243b53;">
                Great news. Your account has been approved by our admin team, and you are all set to start your driving journey.
              </p>
              <div style="background:#f0f9ff; border:1px solid #b6e0fe; border-radius:12px; padding:14px 16px; margin:0 0 16px;">
                <p style="margin:0 0 8px; font-size:14px; font-weight:600; color:#0b4f6c;">You can now:</p>
                <p style="margin:0; font-size:14px; line-height:1.7; color:#334e68;">Book your first lesson<br />Review your schedule<br />Track your driving progress</p>
              </div>
              <p style="margin:0; font-size:15px; line-height:1.65; color:#243b53;">
                Drive smart and stay safe,<br />
                <strong>${appName} Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 6px 0; text-align:center; font-size:12px; color:#627d98;">
              © ${currentYear} ${appName}
            </td>
          </tr>
        </table>
      </div>
    `
  });
}

async function markWelcomeEmailSent(documentId) {
  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

  return new sdk.Databases(client).updateDocument(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_USERS_COLLECTION_ID,
    documentId,
    {
      welcomeEmailSent: true,
      welcomeEmailSentAt: new Date().toISOString()
    }
  );
}

async function getUserDocument(documentId) {
  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

  return new sdk.Databases(client).getDocument(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_USERS_COLLECTION_ID,
    documentId
  );
}

module.exports = async ({ req, res, log, error }) => {
  try {
    assertEnv();

    let payload = extractEventPayload(req);
    const documentId = String(payload.$id || '').trim();

    if (documentId) {
      const emailFromEvent = String(payload.email || '').trim();
      if (!emailFromEvent) {
        try {
          const fullDoc = await getUserDocument(documentId);
          payload = { ...fullDoc, ...payload };
        } catch (fetchError) {
          error(`Failed to fetch document ${documentId}: ${fetchError.message}`);
        }
      }
    }

    const isApproved = normalizeBoolean(payload.approved);
    const hasWelcomeEmailSent = normalizeBoolean(payload.welcomeEmailSent);
    const email = String(payload.email || '').trim();
    const name = String(payload.name || 'Student').trim();

    if (!documentId || !email) {
      log(`Skipped welcome email: missing_document_or_email (id=${documentId || 'none'}, email=${email || 'none'})`);
      return res.json({ skipped: true, reason: 'missing_document_or_email' });
    }

    if (!isApproved) {
      log(`Skipped welcome email for ${documentId}: not_approved`);
      return res.json({ skipped: true, reason: 'not_approved' });
    }

    if (hasWelcomeEmailSent) {
      log(`Skipped welcome email for ${documentId}: already_sent`);
      return res.json({ skipped: true, reason: 'already_sent' });
    }

    await sendWelcomeEmail(email, name);

    try {
      await markWelcomeEmailSent(documentId);
    } catch (markError) {
      // Email was already sent. Log update failure so schema can be fixed.
      error(`Failed to mark welcomeEmailSent for ${documentId}: ${markError.message}`);
    }

    log(`Welcome email sent to ${email}`);
    return res.json({ success: true, email });
  } catch (err) {
    error(err.message || String(err));
    return res.json({ success: false, error: err.message || 'unknown_error' }, 500);
  }
};

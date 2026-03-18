const API_URL = process.env.REACT_APP_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://final-capstone-3ugp.onrender.com');
const REQUEST_TIMEOUT_MS = 70000;

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const requestWithTimeout = async (path, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal
    });

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const emailVerificationHelper = {
  sendVerificationCode: async (email) => {
    return requestWithTimeout('/api/auth/send-verification-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
  },

  verifyCode: async (email, code) => {
    return requestWithTimeout('/api/auth/verify-verification-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, code })
    });
  },

  getVerificationStatus: async (email) => {
    return requestWithTimeout(`/api/auth/verification-status?email=${encodeURIComponent(email)}`);
  },

  consumeVerification: async (email) => {
    return requestWithTimeout('/api/auth/consume-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
  }
};

export default emailVerificationHelper;

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const emailVerificationHelper = {
  sendVerificationCode: async (email) => {
    const response = await fetch(`${API_URL}/api/auth/send-verification-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send verification code');
    }

    return data;
  },

  verifyCode: async (email, code) => {
    const response = await fetch(`${API_URL}/api/auth/verify-verification-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, code })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify code');
    }

    return data;
  },

  getVerificationStatus: async (email) => {
    const response = await fetch(`${API_URL}/api/auth/verification-status?email=${encodeURIComponent(email)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to check verification status');
    }

    return data;
  },

  consumeVerification: async (email) => {
    const response = await fetch(`${API_URL}/api/auth/consume-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to consume verification state');
    }

    return data;
  }
};

export default emailVerificationHelper;

/**
 * SMS Service Helper
 * Frontend utility for sending SMS notifications via backend API
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const smsHelper = {
  /**
   * Send appointment confirmation SMS
   * @param {string} phoneNumber - Recipient's phone number (09XXXXXXXXX format)
   * @param {Object} appointmentData - Appointment details
   * @returns {Promise<Object>} API response
   */
  sendAppointmentConfirmation: async (phoneNumber, appointmentData) => {
    try {
      const response = await fetch(`${API_URL}/api/sms/appointment-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          appointmentData,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending appointment confirmation SMS:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Send appointment reminder SMS
   * @param {string} phoneNumber - Recipient's phone number
   * @param {Object} appointmentData - Appointment details
   * @returns {Promise<Object>} API response
   */
  sendAppointmentReminder: async (phoneNumber, appointmentData) => {
    try {
      const response = await fetch(`${API_URL}/api/sms/appointment-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          appointmentData,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending appointment reminder SMS:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Send appointment cancellation SMS
   * @param {string} phoneNumber - Recipient's phone number
   * @param {Object} appointmentData - Appointment details
   * @returns {Promise<Object>} API response
   */
  sendAppointmentCancellation: async (phoneNumber, appointmentData) => {
    try {
      const response = await fetch(`${API_URL}/api/sms/appointment-cancellation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          appointmentData,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending appointment cancellation SMS:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Send appointment reschedule SMS
   * @param {string} phoneNumber - Recipient's phone number
   * @param {Object} appointmentData - Appointment details with old and new times
   * @returns {Promise<Object>} API response
   */
  sendAppointmentReschedule: async (phoneNumber, appointmentData) => {
    try {
      const response = await fetch(`${API_URL}/api/sms/appointment-reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          appointmentData,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending appointment reschedule SMS:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Send custom SMS message
   * @param {string} phoneNumber - Recipient's phone number
   * @param {string} message - Custom message to send
   * @returns {Promise<Object>} API response
   */
  sendCustomSMS: async (phoneNumber, message) => {
    try {
      const response = await fetch(`${API_URL}/api/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          message,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending custom SMS:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Check SMS account balance
   * @returns {Promise<Object>} Account balance information
   */
  checkBalance: async () => {
    try {
      const response = await fetch(`${API_URL}/api/sms/balance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking SMS balance:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export default smsHelper;

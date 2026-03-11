const axios = require('axios');

/**
 * SMS Service using SMS API PH (smsapiph.onrender.com)
 * Handles sending SMS notifications for appointments and reminders
 */
class SMSService {
  constructor() {
    this.apiKey = process.env.SMS_API_KEY;
    this.senderName = process.env.SMS_SENDER_NAME || 'EasyDrive';
    this.baseURL = 'https://smsapiph.onrender.com/api/v1';
    
    // Rate limiting: Track last SMS send time
    this.lastSendTime = 0;
    this.minDelayMs = 3000; // Minimum 3 seconds between SMS sends
    
    // Debug logging
    console.log('SMS Service initialized');
    console.log('API Key present:', !!this.apiKey);
    console.log('API Key value:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'NOT FOUND');
    console.log('Base URL:', this.baseURL);
    console.log('Rate limit: Min', this.minDelayMs, 'ms between sends');
  }

  /**
   * Send a single SMS message
   * @param {string} phoneNumber - Recipient phone number (format: 09XXXXXXXXX or +639XXXXXXXXX)
   * @param {string} message - SMS message content
   * @returns {Promise<Object>} Response from SMS API
   */
  async sendSMS(phoneNumber, message) {
    try {
      // Rate limiting: Wait if sending too quickly
      const now = Date.now();
      const timeSinceLastSend = now - this.lastSendTime;
      if (timeSinceLastSend < this.minDelayMs) {
        const waitTime = this.minDelayMs - timeSinceLastSend;
        console.log(`⏱️ Rate limiting: Waiting ${waitTime}ms before sending SMS...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Validate API key
      if (!this.apiKey || this.apiKey === 'your_semaphore_api_key_here') {
        console.error('SMS API key validation failed');
        console.error('API Key:', this.apiKey);
        throw new Error('SMS API key is not configured. Please set SMS_API_KEY in .env file');
      }

      // Format phone number to proper format (+639XXXXXXXXX)
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      console.log(`\n=== SMS DEBUG ===`);
      console.log(`Sending SMS to: ${formattedNumber}`);
      console.log(`Message: ${message}`);
      console.log(`API URL: ${this.baseURL}/send/sms`);

      const response = await axios.post(`${this.baseURL}/send/sms`, {
        recipient: formattedNumber,
        message: message
      }, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      // Update last send time on success
      this.lastSendTime = Date.now();

      console.log('SMS API Response Status:', response.status);
      console.log('SMS API Response Data:', JSON.stringify(response.data, null, 2));
      console.log(`=== END DEBUG ===\n`);
      
      return {
        success: true,
        data: response.data,
        message: 'SMS sent successfully'
      };
    } catch (error) {
      console.error('\n=== SMS ERROR ===');
      console.error('Error Status:', error.response?.status);
      console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Error Message:', error.message);
      console.error('=== END ERROR ===\n');
      
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to send SMS'
      };
    }
  }

  /**
   * Send appointment confirmation SMS
   * @param {string} phoneNumber - Student's phone number
   * @param {Object} appointmentData - Appointment details
   */
  async sendAppointmentConfirmation(phoneNumber, appointmentData) {
    const { studentName, date, time, instructor, vehicleType, lessonType } = appointmentData;
    
    // Keep messages short and avoid spam trigger words
    let message;
    if (lessonType === 'theory') {
      message = `${studentName}: Theory class ${date} ${time} with ${instructor || 'instructor'}. -${this.senderName}`;
    } else {
      message = `${studentName}: Driving lesson ${date} ${time} with ${instructor || 'instructor'}. -${this.senderName}`;
    }
    
    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send appointment reminder SMS
   * @param {string} phoneNumber - Student's phone number
   * @param {Object} appointmentData - Appointment details
   */
  async sendAppointmentReminder(phoneNumber, appointmentData) {
    const { studentName, date, time, instructor, vehicleType, lessonType } = appointmentData;
    
    // Shorter, clearer reminder messages
    let message;
    if (lessonType === 'theory') {
      message = `${studentName}: Reminder - Theory class tomorrow ${date} ${time} with ${instructor || 'instructor'}. -${this.senderName}`;
    } else {
      message = `${studentName}: Reminder - Driving lesson tomorrow ${date} ${time} with ${instructor || 'instructor'}. -${this.senderName}`;
    }
    
    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send appointment cancellation SMS
   * @param {string} phoneNumber - Student's phone number
   * @param {Object} appointmentData - Appointment details
   */
  async sendAppointmentCancellation(phoneNumber, appointmentData) {
    const { studentName, date, time, lessonType } = appointmentData;
    
    const type = lessonType === 'theory' ? 'Theory class' : 'Driving lesson';
    const message = `${studentName}: ${type} ${date} ${time} has been cancelled. Please call to reschedule. -${this.senderName}`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send appointment rescheduled SMS
   * @param {string} phoneNumber - Student's phone number
   * @param {Object} appointmentData - Appointment details
   */
  async sendAppointmentReschedule(phoneNumber, appointmentData) {
    const { studentName, oldDate, oldTime, newDate, newTime } = appointmentData;
    
    const message = `${studentName}: Lesson moved to ${newDate} ${newTime}. Was ${oldDate} ${oldTime}. -${this.senderName}`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Format phone number to Philippine format (+639XXXXXXXXX)
   * @param {string} phoneNumber - Input phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If starts with 0, replace with +639
    if (cleaned.startsWith('0')) {
      return '+63' + cleaned.substring(1);
    }
    
    // If starts with 63, add +
    if (cleaned.startsWith('63')) {
      return '+' + cleaned;
    }
    
    // If doesn't start with 63, add +63
    return '+63' + cleaned;
  }

  /**
   * Check SMS account balance - DISABLED (not needed for this application)
   * @returns {Promise<Object>} Account balance information
   */
  // async checkBalance() {
  //   try {
  //     const response = await axios.get(`${this.baseURL}/account/balance`, {
  //       headers: {
  //         'x-api-key': this.apiKey
  //       }
  //     });

  //     return {
  //       success: true,
  //       data: response.data
  //     };
  //   } catch (error) {
  //     console.error('Error checking balance:', error.response?.data || error.message);
  //     return {
  //       success: false,
  //       error: error.response?.data || error.message
  //     };
  //   }
  // }
}

module.exports = new SMSService();

const AfricaTalking = require('africastalking');

const username = process.env.AFRICASTALKING_USERNAME || '';
const apiKey = process.env.AFRICASTALKING_API_KEY || '';
const senderId = process.env.AFRICASTALKING_SENDER_ID || '';

const adminPhoneList = (process.env.AFRICASTALKING_ADMIN_PHONES || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const isConfigured = Boolean(username && apiKey && adminPhoneList.length > 0);

const normalizeEthioPhone = (phone) => {
  if (!phone) return null;
  const clean = String(phone).replace(/\s|-/g, '');

  if (/^\+2519\d{8}$/.test(clean)) return clean;
  if (/^2519\d{8}$/.test(clean)) return `+${clean}`;
  if (/^09\d{8}$/.test(clean)) return `+251${clean.slice(1)}`;

  return null;
};

const getNormalizedAdminPhones = () =>
  adminPhoneList.map(normalizeEthioPhone).filter(Boolean);

const sendSms = async ({ recipients, message }) => {
  if (!isConfigured) {
    return { skipped: true, reason: 'Africa\'s Talking SMS is not configured' };
  }

  const normalizedRecipients = (recipients || []).map(normalizeEthioPhone).filter(Boolean);
  if (!normalizedRecipients.length) {
    return { skipped: true, reason: 'No valid recipient phone numbers found' };
  }

  const africastalking = AfricaTalking({ username, apiKey });
  const sms = africastalking.SMS;

  const payload = {
    to: normalizedRecipients,
    message,
  };

  if (senderId) {
    payload.from = senderId;
  }

  const result = await sms.send(payload);
  return { skipped: false, result };
};

const sendAdminRegistrationAlert = async ({ name, email, phone, isAdmin }) => {
  const recipients = getNormalizedAdminPhones();
  const userPhone = normalizeEthioPhone(phone);
  const message = [
    'New user registration',
    `Name: ${name || 'N/A'}`,
    `Email: ${email || 'N/A'}`,
    `Phone: ${userPhone || phone || 'N/A'}`,
    `Role: ${isAdmin ? 'Admin' : 'User'}`,
  ].join(' | ');

  return sendSms({ recipients, message });
};

module.exports = {
  isConfigured,
  normalizeEthioPhone,
  sendAdminRegistrationAlert,
};

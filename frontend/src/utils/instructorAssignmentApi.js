import { account } from '../appwrite/config';

const apiBaseUrl = process.env.REACT_APP_API_URL || (
  typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:5000'
    : 'https://final-capstone-3ugp.onrender.com'
);

const requestWithSession = async (path, options = {}) => {
  const { jwt } = await account.createJWT();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      ...options.headers
    }
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'The instructor service could not complete your request.');
  }

  return result;
};

export const fetchMyInstructorAssignment = async () => {
  const result = await requestWithSession('/api/users/me/instructor-assignment');
  return result.assignment || null;
};

export const saveMyInstructorAssignment = async (instructorId) => {
  const result = await requestWithSession('/api/users/me/instructor-assignment', {
    method: 'PUT',
    body: JSON.stringify({ instructorId })
  });
  return result.assignment;
};

export const ensureMyInstructorProfile = async () => {
  const result = await requestWithSession('/api/instructors/me/profile', {
    method: 'PUT'
  });
  return result.instructor;
};

export const fetchMyAssignedUsers = async () => {
  const result = await requestWithSession('/api/instructors/me/assigned-users');
  return result.users || [];
};

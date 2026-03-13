import { Client, Account, Databases, Storage } from 'appwrite';

// Appwrite configuration
const appwriteConfig = {
  endpoint: 'https://sgp.cloud.appwrite.io/v1', // Your Appwrite Endpoint
  projectId: '69ac803a001c47a4f8c3', // Your Appwrite Project ID
  databaseId: 'main-database', // Your Database ID (create this in Appwrite Console)
  usersCollectionId: 'users', // Users collection ID (create this in Appwrite Console)
  appointmentsCollectionId: 'appointments', // Appointments collection ID (create this in Appwrite Console)
  bookingsCollectionId: 'bookings', // Bookings collection ID (create this in Appwrite Console)
  vehiclesCollectionId: 'vehicles', // Vehicles collection ID (create this in Appwrite Console)
  instructorsCollectionId: 'instructors', // Instructors collection ID (create this in Appwrite Console)
  storageBucketId: process.env.REACT_APP_APPWRITE_STORAGE_BUCKET_ID || '' // Optional Appwrite Storage bucket ID for uploads
};

// Initialize Appwrite Client
const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

// Initialize Appwrite services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Helper to build a public view URL for a file in Appwrite Storage
export const buildStorageFileUrl = (bucketId, fileId) => {
  if (!bucketId || !fileId) return '';
  // Appwrite Storage public view URL format
  return `${appwriteConfig.endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${appwriteConfig.projectId}`;
};

// Export config for use in other files
export const { databaseId, usersCollectionId, appointmentsCollectionId, bookingsCollectionId, vehiclesCollectionId, instructorsCollectionId, storageBucketId } = appwriteConfig;

export default client;

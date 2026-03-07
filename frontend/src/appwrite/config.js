import { Client, Account, Databases } from 'appwrite';

// Appwrite configuration
const appwriteConfig = {
  endpoint: 'https://sgp.cloud.appwrite.io/v1', // Your Appwrite Endpoint
  projectId: '69ac803a001c47a4f8c3', // Your Appwrite Project ID
  databaseId: 'main-database', // Your Database ID (create this in Appwrite Console)
  usersCollectionId: 'users', // Users collection ID (create this in Appwrite Console)
  appointmentsCollectionId: 'appointments', // Appointments collection ID (create this in Appwrite Console)
  bookingsCollectionId: 'bookings' // Bookings collection ID (create this in Appwrite Console)
};

// Initialize Appwrite Client
const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

// Initialize Appwrite services
export const account = new Account(client);
export const databases = new Databases(client);

// Export config for use in other files
export const { databaseId, usersCollectionId, appointmentsCollectionId, bookingsCollectionId } = appwriteConfig;

export default client;

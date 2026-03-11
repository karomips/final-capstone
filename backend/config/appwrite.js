const sdk = require('node-appwrite');

// Appwrite configuration for backend
const appwriteConfig = {
  endpoint: 'https://sgp.cloud.appwrite.io/v1', // Your Appwrite Endpoint
  projectId: '69ac803a001c47a4f8c3', // Your Appwrite Project ID
  apiKey: 'standard_f6753095e67988e07974c53727df08b4db07cdc936dddd0061e05d49e774c82274aa26eb231043d9fefe8230ae834b3b05ceb0f15667eade89d5361382d71ddc16f5e9c409bf404ee99852f50cec9fc736f24b5021128dbdc13aba8813cf6e1d33dba99b112c0951eb7b9e20373d48b1d833eae7d061db2597c96224abbeaceb', // Your Appwrite API Key
  databaseId: 'main-database', // Your Database ID (create this in Appwrite Console)
  usersCollectionId: 'users', // Users collection ID
  appointmentsCollectionId: 'appointments', // Appointments collection ID
  bookingsCollectionId: 'bookings' // Bookings collection ID
};

// Initialize Appwrite Client
const client = new sdk.Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setKey(appwriteConfig.apiKey);

// Initialize Appwrite services
const databases = new sdk.Databases(client);
const users = new sdk.Users(client);

module.exports = {
  client,
  databases,
  users,
  databaseId: appwriteConfig.databaseId,
  usersCollectionId: appwriteConfig.usersCollectionId,
  appointmentsCollectionId: appwriteConfig.appointmentsCollectionId,
  bookingsCollectionId: appwriteConfig.bookingsCollectionId
};

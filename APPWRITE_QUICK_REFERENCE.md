# 🎯 Appwrite Quick Reference

## Configuration Values

```javascript
Project ID: 69ac803a001c47a4f8c3
Endpoint: https://sgp.cloud.appwrite.io/v1
Database ID: main-database
Collections: users, appointments
```

## Common Operations

### Authentication

```javascript
import { account } from '../appwrite/config';
import { ID } from 'appwrite';

// Sign up
await account.create(ID.unique(), email, password, name);

// Login
await account.createEmailPasswordSession(email, password);

// Get current user
const user = await account.get();

// Logout
await account.deleteSession('current');
```

### Database Operations

```javascript
import { databases, databaseId, usersCollectionId } from '../appwrite/config';
import { ID, Query } from 'appwrite';

// Create document
const doc = await databases.createDocument(
  databaseId,
  usersCollectionId,
  ID.unique(),
  { name: 'John', email: 'john@example.com' }
);

// Get document
const doc = await databases.getDocument(
  databaseId,
  usersCollectionId,
  documentId
);

// Update document
const updated = await databases.updateDocument(
  databaseId,
  usersCollectionId,
  documentId,
  { name: 'Jane' }
);

// Delete document
await databases.deleteDocument(
  databaseId,
  usersCollectionId,
  documentId
);

// List documents with queries
const docs = await databases.listDocuments(
  databaseId,
  usersCollectionId,
  [
    Query.equal('role', 'admin'),
    Query.orderDesc('createdAt'),
    Query.limit(10)
  ]
);
```

## Common Queries

```javascript
import { Query } from 'appwrite';

// Equal
Query.equal('status', 'active')

// Not equal
Query.notEqual('status', 'deleted')

// Less than / Greater than
Query.lessThan('age', 18)
Query.greaterThan('score', 100)

// Search
Query.search('name', 'john')

// Order
Query.orderAsc('createdAt')
Query.orderDesc('createdAt')

// Limit
Query.limit(10)
Query.offset(20)
```

## User Properties

```javascript
currentUser.$id          // User ID
currentUser.email        // Email
currentUser.name         // Name
currentUser.emailVerification  // Boolean
currentUser.$createdAt   // Created timestamp
```

## Error Handling

```javascript
try {
  await databases.getDocument(dbId, collId, docId);
} catch (error) {
  if (error.code === 404) {
    console.log('Document not found');
  } else if (error.code === 401) {
    console.log('Unauthorized');
  } else {
    console.log('Error:', error.message);
  }
}
```

## Permissions

```javascript
import { Permission, Role } from 'appwrite';

// When creating document with specific permissions
const doc = await databases.createDocument(
  databaseId,
  collectionId,
  ID.unique(),
  data,
  [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId))
  ]
);
```

## Environment Variables (Optional)

Create `.env` file in frontend:
```
REACT_APP_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
REACT_APP_APPWRITE_PROJECT_ID=69ac803a001c47a4f8c3
REACT_APP_APPWRITE_DATABASE_ID=main-database
```

Then use in config:
```javascript
const appwriteConfig = {
  endpoint: process.env.REACT_APP_APPWRITE_ENDPOINT,
  projectId: process.env.REACT_APP_APPWRITE_PROJECT_ID,
  // ...
};
```

## Useful Links

- **Console**: https://cloud.appwrite.io/console/project-69ac803a001c47a4f8c3
- **Docs**: https://appwrite.io/docs
- **Community**: https://discord.gg/appwrite
- **GitHub**: https://github.com/appwrite/appwrite

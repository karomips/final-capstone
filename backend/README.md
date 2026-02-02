# Backend API

Node.js/Express backend with Firebase Admin SDK.

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment:
   - `.env` file is already configured
   - Service account key is in `config/serviceAccountKey.json`

3. Start the server:
```bash
npm run dev    # Development with auto-reload
npm start      # Production
```

Server will run on: http://localhost:5000

## API Endpoints

### Test
- `GET /api` - Test if API is running

### Users
- `GET /api/users/:uid` - Get user profile by UID
- `POST /api/users/:uid` - Create/Update user profile

## Technologies
- Express.js
- Firebase Admin SDK
- CORS
- dotenv

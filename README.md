# Capstone Final Project

Full-stack application with React frontend and Node.js backend.

## Project Structure

```
final-capstone/
├── frontend/          # React application
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/           # Node.js/Express API
│   ├── server.js
│   ├── config/
│   └── package.json
├── package.json       # Root scripts
└── README.md
```

## Quick Start (Recommended)

**Install all dependencies (first time only):**
```bash
npm run install-all
```

**Start both frontend and backend:**
```bash
npm start
```

This will run:
- Frontend on: http://localhost:3000
- Backend on: http://localhost:5000

## Alternative: Run Individually

### Frontend Only

```bash
cd frontend
npm install
npm start
```

### Backend Only

```bash
cd backend
npm install
npm run dev
```

## Features

- **Frontend**: React with Firebase Authentication
- **Backend**: Express.js with Firebase Admin SDK
- User registration and login
- Protected routes
- RESTful API

## Technologies

### Frontend
- React 18
- React Router
- Firebase SDK
- CSS3

### Backend
- Node.js
- Express.js
- Firebase Admin SDK
- CORS

## Setup Instructions

See individual README files in `frontend/` and `backend/` folders for detailed setup instructions.

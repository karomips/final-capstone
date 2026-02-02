# React Firebase UI

A simple React application with a Firebase-like authentication UI.

## Features

- Login page
- Signup page
- Dashboard with user information
- Responsive design
- Modern UI with gradient effects

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
  ├── components/
  │   ├── Login.js          # Login page component
  │   ├── Signup.js         # Signup page component
  │   ├── Dashboard.js      # Dashboard component
  │   ├── Auth.css          # Styles for auth pages
  │   └── Dashboard.css     # Styles for dashboard
  ├── App.js                # Main app component with routing
  ├── App.css               # App styles
  ├── index.js              # Entry point
  └── index.css             # Global styles
```

## Next Steps

To integrate Firebase:
1. Create a Firebase project
2. Install Firebase SDK: `npm install firebase`
3. Create a Firebase config file
4. Replace the mock authentication logic with Firebase Auth methods

## Notes

Currently, the authentication is simulated. Any email/password will work for login after signup.

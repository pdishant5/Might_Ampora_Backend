# Might Ampora Backend

Backend API for the Might Ampora mobile application.

## Features

- 🔐 Multiple authentication methods (Google, OTP)
- 📱 User account management
- 🗑️ Account deletion (Google Play Store compliant)
- 🔄 Refresh token management
- 🛡️ Security features (Helmet, HPP, Rate Limiting)
- 📊 Activity tracking
- 🌞 Solar data management
- 📱 Gadget management

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **Authentication:** JWT
- **Deployment:** Render

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB instance
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create .env file (see .env.example)
cp .env.example .env

# Run development server
npm run dev

# Run production server
npm start
```

## Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=8000
ACCESS_TOKEN_SECRET=your_secret_here
REFRESH_TOKEN_SECRET=your_secret_here
MONGODB_URI=your_mongodb_connection_string
```

## API Endpoints

### Authentication
- `POST /api/v1/users/google` - Google Sign-In
- `POST /api/v1/users/request-otp` - Request OTP
- `POST /api/v1/users/verify-otp` - Verify OTP
- `POST /api/v1/users/otp-signup` - Sign up with OTP
- `POST /api/v1/users/profile` - Get User Profile
- `POST /api/v1/users/refresh-token` - Refresh Access Token
- `POST /api/v1/users/logout` - Logout User
- `POST /api/v1/users/delete-account` - Delete Account ⭐

### Other Endpoints
- `/api/v1/gadgets` - Gadget management
- `/api/v1/solar` - Solar data
- `/api/v1/activity` - Activity tracking

## Google Play Store Compliance

### Data Deletion
The app includes a compliant data deletion flow:

- **API Endpoint:** `POST /api/v1/users/delete-account`
- **User Info Page:** `/public/data-deletion.html`
- **Documentation:** See [DELETE_ACCOUNT_API.md](./DELETE_ACCOUNT_API.md)

For Google Play Store submission, use this URL:
```
https://your-app-name.onrender.com/public/data-deletion.html
```

## Deployment

### Deploy to Render

See detailed guide: [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

**Quick steps:**
1. Push code to GitHub
2. Create new Web Service on Render
3. Connect repository
4. Add environment variables
5. Deploy
6. Your URL: `https://your-app-name.onrender.com`

## Documentation

- [Delete Account API](./DELETE_ACCOUNT_API.md) - Complete API documentation
- [Render Deployment](./RENDER_DEPLOYMENT.md) - Deployment guide

## Project Structure

```
server/
├── app.js                 # Express app configuration
├── index.js              # Server entry point
├── config/               # Configuration files
├── controllers/          # Route controllers
├── database/             # Database connection
├── middlewares/          # Custom middlewares
├── models/              # MongoDB models
├── routes/              # API routes
├── services/            # Business logic
├── utils/               # Utility functions
└── public/              # Static files
    └── data-deletion.html
```

## Security Features

- ✅ Helmet.js for security headers
- ✅ HPP for parameter pollution protection
- ✅ Rate limiting (100 requests per 15 min)
- ✅ CORS configuration
- ✅ JWT token authentication
- ✅ Request size limiting (10kb)

## License

ISC

## Author

Dishant Patel
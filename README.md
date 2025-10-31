# Project Management Platform

A full-stack role-based project & task management application with authentication, team management, reporting dashboard, and modern dark-themed UI.

## Tech Stack

### Frontend (client)
- React 19 + Vite
- React Router
- Context API for Auth
- Axios
- Recharts (dashboard charts)
- Lucide Icons
- Framer Motion (potential animations)
- Custom dark theme CSS

### Backend (server)
- Node.js + Express (ES Modules)
- MongoDB + Mongoose
- Passport (Google OAuth ready)
- JSON Web Tokens (JWT)
- Argon2id password hashing (upgraded from bcrypt)
- CORS enabled for dev

## Features
- User registration & secure login (JWT)
- Role-based access: employee / manager
- Google OAuth skeleton (extendable)
- Project creation & membership management
- Task tracking with status & priority
- Team listing (manager only endpoints)
- Dashboard stats & reporting endpoints
- **Team Chat with Encryption & Compression**
  - AES-256-CBC encryption for all messages
  - Gzip compression (60-70% data reduction)
  - Team member validation and access control
  - Message read tracking and editing capabilities
  - Auto-refresh for real-time updates
- Strong client-side validation (password strength, restricted email domains)
- Dark theme UI for auth pages
- Forgot Password workflow (frontend + backend stub)

## Monorepo Structure
```
client/        # React frontend
server/        # Express API server
```

## Environment Variables
Create a `.env` file in `server/` (not committed). Example:
```
MONGO_URI=mongodb+srv://23104072_db_user:mTX5tX9YMrOBMESx@cluster0.pu5ag7d.mongodb.net/
MONGO_URI=mongodb://localhost:27017/project_manager
PORT=5000
JWT_SECRET=replace_this_with_a_long_random_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

(Optional) You can add an `.env.example` to document required fields.

## Install & Run
### 1. Install dependencies
```
cd client && npm install
cd ../server && npm install
```

### 2. Start development servers (two terminals)
```
# Terminal 1
cd server
npm run dev

# Terminal 2
cd client
npm run dev
```
Frontend dev server: http://localhost:5173  
Backend API: http://localhost:5000

## Available NPM Scripts
### Client
- `npm run dev` - Vite dev server
- `npm run build` - Production build
- `npm run preview` - Preview build
- `npm run lint` - ESLint

### Server
- `npm run dev` - Nodemon dev server
- `npm start` - Run server once

## API Routes (Summary)
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| POST | /api/auth/forgot-password | Forgot password (stub) |
| GET  | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET  | /api/tasks | List tasks |
| POST | /api/tasks | Create task |
| GET  | /api/team | List team members |
| POST | /api/team/add | Add team member |
| GET  | /api/reports/dashboard-stats | Dashboard stats |
| GET  | /api/messages/:teamId | Get team messages |
| POST | /api/messages/:teamId | Send team message |
| PATCH | /api/messages/:teamId/read | Mark messages as read |
| DELETE | /api/messages/:messageId | Delete a message |
| GET  | /api/messages/:teamId/stats | Get message statistics |

(Protected routes require `Authorization: Bearer <token>`)

## Forgot Password Workflow
Current implementation: 
- Frontend sends email to `/api/auth/forgot-password`
- Backend simulates processing (logs) and returns success regardless of email existence (security-friendly)
Future extension:
1. Generate reset token
2. Store with expiration in DB
3. Send email (SendGrid / SES / etc.)
4. Add `/reset-password/:token` route & page

## Validation Rules
### Registration
- Name: 2–50 chars, letters/spaces/hyphens/apostrophes
- Email: Must belong to a curated list of popular providers (Gmail, Outlook, Yahoo, iCloud, etc., plus .edu support)
- Password: 8+ chars, upper, lower, number, special char
- Role: employee | manager

### Login
- Same email provider restrictions

## Security Notes
- JWT secret must be long & random
- Add rate limiting & helmet for production
- Implement HTTPS & secure cookies if deploying behind a proxy
- Passwords hashed exclusively with Argon2id (memory-hard; safer vs GPU cracking than bcrypt).

## Password Hashing
All passwords are hashed with Argon2id via the `argon2` library using secure defaults. No legacy bcrypt hashes are supported in this codebase. If migrating from an older deployment that used bcrypt, force users to reset their passwords or run an offline migration script before deploying this version.

### Migrating From Older (bcrypt) Instances
Because bcrypt support has been fully removed:
1. Take a backup of your users collection.
2. Either (a) invalidate all existing sessions & require a password reset email flow, or (b) run a one-time offline script that:
	- Reads each user with a bcrypt hash (prefix `$2`)
	- Prompts / generates a temporary random password sent securely to the user (or triggers reset tokens)
	- Replaces the password with an Argon2id hash
3. Deploy this Argon2-only version after all active bcrypt hashes are gone.

Attempting to log in with a leftover bcrypt hash will now fail because only Argon2 verification exists.

## Production Build
```
# Build client
cd client
npm run build
# Serve client via a static host (Netlify / Vercel) or behind your Node server (additional wiring needed)
```

## Suggested Next Improvements
- Password reset full implementation
- Email verification flow
- Role-based UI gating (conditional rendering)
- Add tests (Jest + React Testing Library / Supertest for API)
- Add Docker compose for Mongo + services
- Add pagination for large project/task sets
- Implement refresh tokens & logout invalidation

## License
MIT (see LICENSE file if added)

## Contributing
PRs welcome. Open issues for feature discussion.

## Author
Your Name (replace in README). Add contact or portfolio link.

## Authentication & API (Added)

### Environment Variables
See `.env.example` and copy to `.env` in `server/` (backend) root or project root depending on your process manager.

```
MONGO_URI=mongodb+srv://23104072_db_user:mTX5tX9YMrOBMESx@cluster0.pu5ag7d.mongodb.net/
PORT=5000
JWT_SECRET=replace_this_with_a_long_random_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
MESSAGE_ENCRYPTION_KEY=bd8a132f697c0b60b01bfad3b7398a8a4e8fecd9ff7237c28a6b2350b7e4c2df
```

**Note:** Generate `MESSAGE_ENCRYPTION_KEY` using:
```bash
node -e "console.log('MESSAGE_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### Login Request
POST /api/auth/login
Body: { "email": "user@example.com", "password": "Secret123!" }

Success 200:
{ "success": true, "token": "<jwt>", "user": { "id": "...", "name": "...", "email": "...", "role": "employee|manager" } }

MFA Challenge 200 (when backup codes exist):
{ "success": true, "mfaRequired": true, "mfaType": "backup", "mfaToken": "<short-lived-token>" }

Failure (credentials / validation):
400 { "success": false, "error": "Invalid credentials" }

Server misconfig (e.g. missing secret):
500 { "success": false, "error": "Server configuration error" }

### MFA Verify
POST /api/auth/mfa/verify
Body: { "mfaToken": "<token>", "backupCode": "abcd1234" }

### Health Check
GET /api/health -> { status: 'ok', uptime, timestamp }

### Frontend API Base
Configured via `VITE_API_URL`; default fallback `http://localhost:5000/api`.

### Error Handling Strategy
All auth routes return JSON with `success` boolean and either `token/user` or `error` string. Transport issues are surfaced to the user as network connectivity messages instead of generic failure.

---
Happy building! 🚀

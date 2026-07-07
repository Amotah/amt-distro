# amt_distro backend

A starter Node.js backend project for AMT Distro using Express and MongoDB.

## Requirements

- Node.js 18+
- npm
- MongoDB Atlas cluster or local MongoDB instance

## Setup

1. Install dependencies:
   npm install
2. Copy environment file:
   copy .env.example .env
3. Update MongoDB connection values in `.env`
  - Use `MONGODB_URI` for the SRV string from Atlas
  - If SRV DNS fails, paste the standard Atlas connection string into `MONGODB_URI_DIRECT`
4. Start development server:
   npm run dev

## Activity Email Notifications

The backend can send email alerts for successful user activity such as registration, login, user CRUD, artist CRUD, and release CRUD.

Configure these environment variables to enable delivery:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE` (`true` for SMTPS)
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `ACTIVITY_NOTIFICATION_EMAILS` as a comma-separated list of recipient emails

If `ACTIVITY_NOTIFICATION_EMAILS` is not set, the backend falls back to active admin accounts in the database.

## Scripts

- `npm run dev` - start with nodemon
- `npm start` - start with node
- `npm run lint` - run ESLint

## Endpoints

- `GET /health` - health check endpoint
- `GET /db-health` - database connection health check
- `POST /auth/register` - register a new user
- `POST /auth/login` - login and receive a JWT + dashboard path
- `GET /auth/me` - fetch the current authenticated user
- `POST /users` - create a user account record
- `GET /users/me` - fetch the current authenticated user profile
- `GET /users` - list users, admin only
- `GET /users/:id` - get a user by id, admin only
- `PATCH /users/:id` - update a user by id, admin only
- `DELETE /users/:id` - delete a user by id, admin only
- `GET /releases` - list releases for the authenticated user
- `POST /releases` - create a release
- `PATCH /releases/:id` - update a release
- `DELETE /releases/:id` - delete a release
- `GET /artists` - list artists
- `GET /artists/:id` - get artist by id
- `POST /artists` - create artist
- `PUT /artists/:id` - update artist
- `DELETE /artists/:id` - delete artist

## Role Routing

- `artist` users are routed to `/dashboard`
- `label` users are routed to `/label-dashboard`

## Project Structure

```
amt_distro/
  src/
    config/
      env.js
    controllers/
      artistController.js
    db/
      mongoose.js
    models/
      artist.js
    routes/
      artists.js
      health.js
    server.js
  .env.example
  .gitignore
  package.json
  README.md
```

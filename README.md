# AMT Distro — Music Distribution Platform

A comprehensive music distribution platform featuring artist/label management, payment processing, royalty tracking, and admin controls.

## 🎵 Features

- **Artist Dashboard**: Upload releases, track streaming analytics, manage metadata
- **Label Management**: Manage multiple artists, aggregate analytics, approve releases
- **Admin Controls**: User management, role-based access control (RBAC), dispute resolution
- **Royalty System**: Advance requests, payment tracking, automated royalty calculations
- **Smart Links**: Generate shareable links for releases across platforms
- **Payment Integration**: Bank account verification, payout processing
- **Analytics**: Real-time streaming stats, revenue tracking, artist insights

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast bundling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Supabase JS Client** for backend integration

### Backend
- **Supabase Edge Functions** (Deno-based serverless)
- **Supabase Auth** for user authentication
- **Supabase PostgreSQL** for data storage
- **Hono Framework** for API routing

### Infrastructure
- **Supabase** (all-in-one: auth, database, functions)
- **Node.js** for local development

## 📋 Prerequisites

Before setting up locally, ensure you have:

- **Node.js** 16+ ([download](https://nodejs.org/))
- **npm** or **yarn**
- **Git** ([download](https://git-scm.com/))
- A **Supabase project** ([sign up free](https://supabase.com/))

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Amotah/amt-distro.git
cd amt-distro
```

### 2. Install Dependencies

```bash
cd figma-export
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the `figma-export/` directory:

```env
VITE_SUPABASE_URL=https://vatpvfrbgeatdeypqcrv.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_API_URL=http://localhost:5173
```

Retrieve your Supabase credentials from your project dashboard.

### 4. Start the Development Server

```bash
npm run dev
```

The platform will be available at `http://localhost:5173`

## 📁 Project Structure

```
.
├── figma-export/                    # Main application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/          # React UI components
│   │   │   ├── contexts/            # React contexts
│   │   │   ├── pages/               # Page components
│   │   │   ├── utils/               # Utilities & API helpers
│   │   │   ├── AdminApp.tsx         # Admin dashboard
│   │   │   ├── App.tsx              # Main app router
│   │   │   └── RootApp.tsx          # Root layout
│   │   ├── assets/                  # Images, logos
│   │   └── styles/                  # Global CSS
│   ├── supabase/
│   │   ├── functions/
│   │   │   └── make-server-79198001/  # Production API
│   │   │       ├── index.tsx        # Main API routes (Hono)
│   │   │       ├── user-service.tsx # User CRUD & auth
│   │   │       ├── kv_store.tsx     # Data storage layer
│   │   │       └── ...
│   │   └── *.sql                    # Database migrations
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── docs/
    └── ADMIN_SYSTEM_DOCUMENTATION.md  # Admin features guide
```

## 🔧 Development

### Build for Production

```bash
npm run build
```

Output will be in `dist/`

### Run Tests (if configured)

```bash
npm run test
```

### Type Check

```bash
npm run type-check
```

## 🛠️ API Endpoints

### Authentication
- `POST /auth/signup` — Create new account
- `POST /auth/login` — User login
- `POST /auth/logout` — User logout

### Artists
- `GET /artists/:id` — Get artist profile
- `PUT /artists/:id` — Update artist info
- `POST /artists/:id/releases` — Upload new release

### Admin
- `GET /admin/users` — List all users
- `DELETE /admin/users/:userId` — Delete user
- `DELETE /admin/admin-users/:userId` — Delete admin account
- `PUT /admin/users/:userId/suspend` — Suspend/activate user
- `GET /admin/artist-label-management` — Label & artist overview

See [API documentation](./figma-export/ADMIN_SYSTEM_DOCUMENTATION.md) for full endpoint reference.

## 🔐 Authentication & Authorization

The platform uses **Supabase Auth** with role-based access control (RBAC):

- **Admin**: Full platform control (user management, dispute resolution)
- **Label**: Manage multiple artists, approve/reject releases
- **Artist**: Upload releases, view analytics, request royalty advances
- **User**: Generic platform access

Roles are stored in the `users` table and enforced server-side via Supabase edge functions.

## 💾 Database Schema

Key tables:
- `users` — Platform users (artists, labels, admins)
- `releases` — Music releases with metadata
- `streaming_data` — Analytics from distribution partners
- `royalty_advances` — Advance requests and payouts
- `disputes` — Support ticket system

Schemas are defined in `supabase/*.sql` files.

## 📤 Deployment

### Deploy Updated Functions to Supabase

After making changes to edge functions:

```bash
cd figma-export
npx supabase functions deploy make-server-79198001 --project-ref vatpvfrbgeatdeypqcrv
```

### Deploy Frontend

The frontend can be deployed to Vercel, Netlify, GitHub Pages, or any static host:

```bash
npm run build
# Deploy the 'dist' folder to your hosting provider
```

## 🐛 Recent Bug Fixes

### v1.0.1
- **Fixed**: User deletion route collision (admin-delete no longer intercepts user-delete)
- **Fixed**: Suspend/activate persistence for artists (KYC normalization now preserves explicit toggles)
- **Improved**: Royalty Advances calculator now reactive to user input

See [release notes](./CHANGELOG.md) for version history.

## 📚 Documentation

- [Admin System Documentation](./figma-export/ADMIN_SYSTEM_DOCUMENTATION.md)
- [Database Schema](./figma-export/DATABASE_SCHEMA.md)
- [Deployment Guide](./DEPLOY_BACKEND.md)
- [Setup Instructions](./figma-export/ADMIN_QUICK_START.md)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and commit: `git commit -m "Add your feature"`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## 📝 Environment Configuration

| Variable | Description | Example |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://vatpvfrbgeatdeypqcrv.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `VITE_API_URL` | API base URL (dev/prod) | `http://localhost:5173` |

## 🆘 Troubleshooting

### Port 5173 already in use
```bash
# Use a different port
npm run dev -- --port 3000
```

### Supabase connection errors
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check network connectivity to Supabase
- Review browser console for CORS errors

### Build fails with TypeScript errors
```bash
npm run type-check  # Check for type issues
npm install         # Reinstall dependencies if corrupted
```

## 📄 License

[Specify your license here, e.g., MIT, Apache 2.0, proprietary]

## 📧 Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Contact: [your contact email]

---

**Project**: AMT Distro Music Distribution Platform  
**Status**: Production Ready  
**Last Updated**: May 2026

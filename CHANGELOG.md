# Changelog

All notable changes to the AMT Distro Music Distribution Platform will be documented in this file.

## [1.0.0] - 2026-05-12

### Initial Release ✨
- ✅ Complete artist dashboard with release management
- ✅ Label dashboard for multi-artist management
- ✅ Admin controls with role-based access (RBAC)
- ✅ Royalty advance system with calculator
- ✅ Payment processing and bank account verification
- ✅ Analytics and streaming data integration
- ✅ Smart links for cross-platform sharing
- ✅ Dispute management system
- ✅ User profile and settings management

### Fixed ✅
- Fixed user deletion route collision (admin-delete no longer intercepts user-delete)
  - Moved admin deletion to `/admin/admin-users/:userId`
  - Preserved user deletion on `/admin/users/:userId`
  - Updated client API calls accordingly

- Fixed suspend/activate persistence for artists
  - Root cause: KYC normalization was overwriting explicit admin toggles
  - Solution: Added explicit `isVerified` check to preserve admin-driven state changes
  - Impact: Suspend/activate now persists correctly across page refreshes

- Removed mock stats from admin user profile modal
  - Cleaned hardcoded stats (247 uploads, 1.2M streams, ₦845K earnings)
  - Applied dark theme styling for better UX

### Improved 🚀
- Royalty Advances calculator now reactive
  - Calculator updates live as user inputs monthly royalties
  - Dynamic range: min = monthly × 6, max = monthly × 12
  - Proper currency formatting with Naira symbol and commas

- Both production and development function copies synchronized
  - `make-server-79198001/` (production) and `server/` (dev) in sync
  - All fixes applied to both sources

### Tech Details 🔧
- Frontend: React 18 + TypeScript + Vite
- Backend: Supabase Edge Functions (Hono)
- Database: Supabase PostgreSQL
- Auth: Supabase Auth + RBAC
- Build: Vite (2821 modules, ~258 KB CSS, full dist)

### Dependencies
- React 18+
- TypeScript 5+
- Vite 5+
- Tailwind CSS 3+
- Supabase Client
- React Router 6+

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

---

## Future Releases 🔮

### Planned Features
- [ ] AI-powered artist insights and recommendations
- [ ] Advanced fraud detection system
- [ ] Marketing campaign tools
- [ ] Real-time royalty payouts
- [ ] Mobile app (iOS/Android)
- [ ] Advanced analytics dashboard
- [ ] Custom reporting tools

---

**Latest Build**: Production Ready ✅  
**Status**: Stable  
**Date**: May 12, 2026

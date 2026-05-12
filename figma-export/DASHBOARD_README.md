# AMTDISTRO Artist Dashboard

## Overview
A professional, modern music distribution platform dashboard built with React, TypeScript, Tailwind CSS, and Recharts.

## Dashboard Structure

### Pages

1. **Dashboard Home** (`/dashboard`)
   - Overview metrics (Revenue, Streams, Listeners, Active Releases)
   - Revenue chart (6-month area chart)
   - Platform distribution (pie chart)
   - Top performing songs
   - Recent activity feed

2. **Catalog** (`/dashboard/catalog`)
   - All releases in grid/list view
   - Search and filter functionality
   - Quick stats (Total, Live, Processing, Draft)
   - Release management (Edit, Delete, Preview)
   - Direct upload button

3. **Upload** (`/dashboard/upload`)
   - Multi-step upload wizard:
     - Step 1: Upload audio files and cover art
     - Step 2: Release information (title, artist, genre, etc.)
     - Step 3: Select distribution platforms
     - Step 4: Review and submit
   - Drag & drop file upload
   - Upload progress tracking
   - Platform selection (Spotify, Apple Music, YouTube Music, etc.)

4. **Analytics** (`/dashboard/analytics`)
   - Streams & listeners over time (line chart)
   - Platform distribution (pie chart)
   - Geographic distribution (top countries)
   - Audience demographics (age/gender bar chart)
   - Key metrics with trend indicators
   - Time range filters (7 days, 30 days, 90 days, year, all time)

5. **Earnings** (`/dashboard/earnings`)
   - Total earnings, current balance, monthly earnings
   - Revenue breakdown by platform (stacked bar chart)
   - Platform earnings breakdown
   - Payment history
   - Payout information and schedule
   - Request payout functionality

6. **Settings** (`/dashboard/settings`)
   - Profile settings
   - Account management
   - Payment preferences
   - Notification settings

## Features

### Layout Components
- **DashboardLayout**: Main layout with sidebar navigation
  - Responsive sidebar (desktop/mobile)
  - User profile dropdown
  - Notification bell
  - Logo and navigation items
  - Help & support link

### Key Features
- ✅ Fully responsive design
- ✅ Interactive charts and visualizations (Recharts)
- ✅ Multi-step upload wizard
- ✅ Real-time progress tracking
- ✅ Search and filter functionality
- ✅ Drag & drop file uploads
- ✅ Platform distribution selection
- ✅ Analytics with multiple chart types
- ✅ Payment history tracking
- ✅ 100% royalty retention messaging
- ✅ Nigerian Naira (₦) currency formatting

### Navigation
- React Router for client-side routing
- Active state highlighting
- Mobile-friendly hamburger menu
- Breadcrumb navigation
- Quick actions from any page

## Technology Stack

- **React 18.3.1** - UI framework
- **TypeScript** - Type safety
- **React Router 7** - Client-side routing
- **Tailwind CSS 4** - Styling
- **Recharts 2.15** - Charts and visualizations
- **Lucide React** - Icons
- **Radix UI** - Accessible components
- **Motion** - Animations

## File Structure

```
/src/app/
├── App.tsx                           # Main app component
├── dashboard-routes.tsx              # Dashboard routing configuration
└── components/
    └── dashboard/
        ├── DashboardLayout.tsx       # Main dashboard layout
        ├── DashboardHome.tsx         # Overview page
        ├── CatalogView.tsx           # Music catalog
        ├── UploadRelease.tsx         # Multi-step upload
        ├── AnalyticsView.tsx         # Analytics & insights
        └── EarningsView.tsx          # Royalties & payments
```

## Usage

### Accessing the Dashboard
1. User logs in via Login component
2. App switches to authenticated mode
3. React Router takes over navigation
4. User lands on `/dashboard` (overview)

### Navigation Flow
- Click sidebar items to navigate between pages
- Mobile: Use hamburger menu
- Logout from user profile dropdown
- Direct links via React Router's Link component

## Customization

### Adding New Pages
1. Create component in `/components/dashboard/`
2. Add route to `dashboard-routes.tsx`
3. Add navigation item to `DashboardLayout.tsx`

### Modifying Charts
- All chart data is defined at the top of each component
- Uses Recharts library - fully customizable
- Responsive containers for all screen sizes

### Styling
- Tailwind CSS utilities throughout
- Custom theme tokens in `/src/styles/theme.css`
- Consistent color palette (purple/pink gradient)
- Dark mode ready (can be enabled)

## Data Flow

Currently uses **mock data** for demonstration:
- Revenue data (6 months)
- Release catalog (6 releases)
- Platform statistics
- Payment history
- Geographic data
- Demographics

**To connect real data:**
1. Replace mock data with API calls
2. Add loading states
3. Implement error handling
4. Add data refresh intervals

## Future Enhancements

- Real-time sync with streaming platforms
- Advanced filtering and sorting
- Bulk upload functionality
- Collaborative features (for labels)
- Export analytics reports
- Email notifications
- Mobile app integration
- AI-powered insights

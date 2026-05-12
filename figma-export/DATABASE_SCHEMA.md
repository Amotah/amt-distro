# AMTDISTRO Database Schema

## Overview
This document outlines the complete database schema for AMTDISTRO music distribution platform. The current implementation uses a key-value store, but this schema represents the ideal relational structure for reference and future migrations.

---

## Core Tables

### 1. Users Table
Primary table for all platform users (artists, labels, admins).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role VARCHAR(20) NOT NULL CHECK (role IN ('artist', 'label', 'admin')),
  country VARCHAR(2), -- ISO 3166-1 alpha-2 country code
  phone_number VARCHAR(20),
  is_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'artist', 'label')),
  subscription_status VARCHAR(20) DEFAULT 'active',
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_country ON users(country);
```

**KV Store Keys:**
- `user:{userId}` → Full user object
- `user:email:{email}` → userId lookup
- `user:role:{role}:{userId}` → Role-based queries

---

### 2. Artists Table
Extended profile information for artist/label accounts.

```sql
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  stage_name VARCHAR(255) NOT NULL,
  bio TEXT,
  avatar_url VARCHAR(500),
  banner_url VARCHAR(500),
  website_url VARCHAR(500),
  spotify_url VARCHAR(500),
  apple_music_url VARCHAR(500),
  instagram_handle VARCHAR(100),
  twitter_handle VARCHAR(100),
  label_name VARCHAR(255), -- For label accounts
  is_verified BOOLEAN DEFAULT false,
  verification_badge VARCHAR(20), -- 'blue', 'gold', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_artists_user_id ON artists(user_id);
CREATE INDEX idx_artists_stage_name ON artists(stage_name);
```

**KV Store Keys:**
- `artist:{artistId}` → Artist profile
- `artist:user:{userId}` → Artist lookup by user

---

### 3. Releases Table
Albums, EPs, and singles.

```sql
CREATE TABLE releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  upc VARCHAR(13) UNIQUE NOT NULL, -- 13-digit UPC
  release_type VARCHAR(20) NOT NULL CHECK (release_type IN ('single', 'ep', 'album', 'compilation')),
  release_date DATE NOT NULL,
  original_release_date DATE,
  primary_artist VARCHAR(255) NOT NULL,
  featured_artists TEXT[], -- Array of featured artist names
  label_name VARCHAR(255),
  copyright_year INTEGER,
  copyright_text VARCHAR(500),
  production_year INTEGER,
  production_text VARCHAR(500),
  genre VARCHAR(100) NOT NULL,
  subgenre VARCHAR(100),
  language VARCHAR(3), -- ISO 639-2 language code
  explicit_content BOOLEAN DEFAULT false,
  artwork_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'processing', 'live', 'takedown', 'failed')),
  submitted_at TIMESTAMP,
  published_at TIMESTAMP,
  metadata JSONB, -- Additional metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_releases_user_id ON releases(user_id);
CREATE INDEX idx_releases_upc ON releases(upc);
CREATE INDEX idx_releases_status ON releases(status);
CREATE INDEX idx_releases_release_date ON releases(release_date);
```

**KV Store Keys:**
- `release:{releaseId}` → Full release object
- `release:user:{userId}:{releaseId}` → User's releases
- `release:upc:{upc}` → UPC lookup
- `release:status:{status}:{releaseId}` → Status-based queries

---

### 4. Tracks Table
Individual songs within releases.

```sql
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  version VARCHAR(255), -- e.g., "Radio Edit", "Extended Mix"
  isrc VARCHAR(12) UNIQUE NOT NULL, -- 12-character ISRC
  track_number INTEGER NOT NULL,
  disc_number INTEGER DEFAULT 1,
  duration INTEGER NOT NULL, -- Duration in seconds
  primary_artist VARCHAR(255) NOT NULL,
  featured_artists TEXT[],
  explicit_content BOOLEAN DEFAULT false,
  preview_start_time INTEGER, -- Preview start in seconds
  preview_duration INTEGER DEFAULT 30, -- Preview length in seconds
  lyrics TEXT,
  language VARCHAR(3),
  genre VARCHAR(100),
  mood VARCHAR(100),
  audio_url VARCHAR(500),
  audio_file_size INTEGER, -- Size in bytes
  audio_format VARCHAR(10), -- 'WAV', 'FLAC', 'MP3'
  audio_bitrate INTEGER,
  audio_sample_rate INTEGER,
  waveform_data JSONB, -- Waveform visualization data
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(release_id, track_number, disc_number)
);

CREATE INDEX idx_tracks_release_id ON tracks(release_id);
CREATE INDEX idx_tracks_isrc ON tracks(isrc);
CREATE INDEX idx_tracks_title ON tracks(title);
```

**KV Store Keys:**
- `track:{trackId}` → Full track object
- `track:release:{releaseId}:{trackId}` → Release's tracks
- `track:isrc:{isrc}` → ISRC lookup
- `isrc:track:{isrc}` → Track ID by ISRC

---

### 5. Contributors Table
Songwriters, producers, composers, and other contributors.

```sql
CREATE TABLE contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), -- NULL if not a platform user
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN (
    'producer', 
    'composer', 
    'lyricist', 
    'arranger', 
    'mixer', 
    'engineer',
    'featured_artist',
    'publisher'
  )),
  percentage_split DECIMAL(5,2) CHECK (percentage_split >= 0 AND percentage_split <= 100),
  pro_affiliation VARCHAR(100), -- Performance Rights Organization
  ipi_number VARCHAR(20), -- Interested Parties Information number
  isni VARCHAR(20), -- International Standard Name Identifier
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contributors_track_id ON contributors(track_id);
CREATE INDEX idx_contributors_user_id ON contributors(user_id);
CREATE INDEX idx_contributors_role ON contributors(role);
```

**KV Store Keys:**
- `contributor:{contributorId}` → Contributor object
- `contributor:track:{trackId}:{contributorId}` → Track's contributors
- `splits:track:{trackId}` → Array of royalty splits

---

### 6. Files Table
Audio files, artwork, and other assets.

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  release_id UUID REFERENCES releases(id) ON DELETE CASCADE,
  file_type VARCHAR(20) NOT NULL CHECK (file_type IN (
    'audio', 
    'artwork', 
    'contract',
    'lyrics',
    'liner_notes'
  )),
  file_name VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL, -- Size in bytes
  mime_type VARCHAR(100) NOT NULL,
  storage_url VARCHAR(500) NOT NULL, -- S3/Supabase Storage URL
  storage_bucket VARCHAR(100),
  storage_path VARCHAR(500),
  checksum VARCHAR(64), -- SHA-256 checksum
  upload_status VARCHAR(20) DEFAULT 'uploading' CHECK (upload_status IN (
    'uploading',
    'processing',
    'completed',
    'failed'
  )),
  metadata JSONB, -- File metadata (dimensions, duration, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_track_id ON files(track_id);
CREATE INDEX idx_files_release_id ON files(release_id);
CREATE INDEX idx_files_file_type ON files(file_type);
```

**KV Store Keys:**
- `file:{fileId}` → File object
- `upload:chunk:{uploadId}:{chunkNumber}` → Chunked upload data
- `upload:metadata:{uploadId}` → Upload session metadata

---

### 7. Distributions Table
Distribution to streaming platforms (DSPs).

```sql
CREATE TABLE distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES releases(id),
  partner VARCHAR(50) NOT NULL CHECK (partner IN (
    'spotify',
    'apple_music',
    'youtube_music',
    'amazon_music',
    'tidal',
    'deezer',
    'pandora',
    'soundcloud',
    'audiomack',
    'boomplay'
  )),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'queued',
    'processing',
    'delivered',
    'live',
    'failed',
    'takedown_requested',
    'removed'
  )),
  delivery_method VARCHAR(20), -- 'api', 'ftp', 'ddex'
  ddex_xml_url VARCHAR(500), -- DDEX XML file location
  external_release_id VARCHAR(255), -- DSP's internal ID
  external_url VARCHAR(500), -- Link to release on DSP
  submitted_at TIMESTAMP,
  delivered_at TIMESTAMP,
  published_at TIMESTAMP,
  error_message TEXT,
  error_code VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  metadata JSONB, -- DSP-specific metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(release_id, partner)
);

CREATE INDEX idx_distributions_release_id ON distributions(release_id);
CREATE INDEX idx_distributions_partner ON distributions(partner);
CREATE INDEX idx_distributions_status ON distributions(status);
```

**KV Store Keys:**
- `distribution:{distributionId}` → Distribution object
- `distribution:release:{releaseId}:{partner}` → Release's distributions
- `delivery:{deliveryId}` → Delivery job details

---

### 8. Royalties Table
Streaming royalties and earnings.

```sql
CREATE TABLE royalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id),
  user_id UUID NOT NULL REFERENCES users(id),
  release_id UUID NOT NULL REFERENCES releases(id),
  platform VARCHAR(50) NOT NULL,
  country VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha-2
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  streams INTEGER NOT NULL DEFAULT 0,
  gross_revenue DECIMAL(12,2) NOT NULL, -- Total before splits
  net_revenue DECIMAL(12,2) NOT NULL, -- After splits
  split_percentage DECIMAL(5,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  exchange_rate DECIMAL(10,6) DEFAULT 1.0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'paid',
    'disputed',
    'voided'
  )),
  report_id VARCHAR(255), -- External report ID
  processed_at TIMESTAMP,
  paid_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_royalties_track_id ON royalties(track_id);
CREATE INDEX idx_royalties_user_id ON royalties(user_id);
CREATE INDEX idx_royalties_platform ON royalties(platform);
CREATE INDEX idx_royalties_period ON royalties(period_start, period_end);
CREATE INDEX idx_royalties_status ON royalties(status);
```

**KV Store Keys:**
- `earning:{earningId}` → Earning object
- `earning:user:{userId}:{earningId}` → User's earnings
- `earning:track:{trackId}:{earningId}` → Track's earnings
- `report:{reportId}` → Streaming report

---

### 9. Payments Table
Payouts to artists and labels.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  fee DECIMAL(12,2) DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL, -- Amount after fees
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'refunded'
  )),
  payout_method VARCHAR(20) NOT NULL CHECK (payout_method IN (
    'bank_transfer',
    'mobile_money'
  )),
  payment_details_id UUID, -- Reference to payment details
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  account_name VARCHAR(255),
  mobile_provider VARCHAR(50),
  mobile_number VARCHAR(20),
  reference VARCHAR(100) UNIQUE, -- Unique payment reference
  external_reference VARCHAR(255), -- Gateway transaction ID
  gateway VARCHAR(50), -- 'paystack', 'flutterwave'
  initiated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_reference ON payments(reference);
CREATE INDEX idx_payments_created_at ON payments(created_at);
```

**KV Store Keys:**
- `payout:{payoutId}` → Payout object
- `payout:user:{userId}:{payoutId}` → User's payouts
- `balance:{userId}` → User balance object
- `payment:details:{detailsId}` → Payment method details

---

## Supporting Tables

### 10. Payment Details Table
Stored payment methods for users.

```sql
CREATE TABLE payment_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method VARCHAR(20) NOT NULL CHECK (method IN ('bank_transfer', 'mobile_money')),
  is_primary BOOLEAN DEFAULT false,
  -- Bank transfer fields
  bank_code VARCHAR(10),
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  account_name VARCHAR(255),
  -- Mobile money fields
  mobile_provider VARCHAR(20), -- 'mtn', 'airtel', 'glo', '9mobile'
  mobile_number VARCHAR(20),
  mobile_account_name VARCHAR(255),
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_details_user_id ON payment_details(user_id);
CREATE UNIQUE INDEX idx_payment_details_primary ON payment_details(user_id) 
  WHERE is_primary = true;
```

---

### 11. ISRC Generator Table
Track ISRC code generation and assignment.

```sql
CREATE TABLE isrc_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isrc VARCHAR(12) UNIQUE NOT NULL,
  track_id UUID REFERENCES tracks(id),
  user_id UUID NOT NULL REFERENCES users(id),
  country_code VARCHAR(2) NOT NULL, -- First 2 chars
  registrant_code VARCHAR(3) NOT NULL, -- Next 3 chars
  year_code VARCHAR(2) NOT NULL, -- Next 2 chars (last 2 digits of year)
  designation_code VARCHAR(5) NOT NULL, -- Last 5 chars (sequence)
  assigned BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_isrc_codes_isrc ON isrc_codes(isrc);
CREATE INDEX idx_isrc_codes_track_id ON isrc_codes(track_id);
CREATE INDEX idx_isrc_codes_assigned ON isrc_codes(assigned);
```

**KV Store Keys:**
- `isrc:{isrc}` → ISRC object
- `isrc:track:{isrc}` → Track ID
- `counter:isrc:{countryCode}{registrantCode}{yearCode}` → Sequence counter

---

### 12. UPC Generator Table
Track UPC code generation and assignment.

```sql
CREATE TABLE upc_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upc VARCHAR(13) UNIQUE NOT NULL,
  release_id UUID REFERENCES releases(id),
  user_id UUID NOT NULL REFERENCES users(id),
  prefix VARCHAR(6) NOT NULL, -- Company prefix
  item_reference VARCHAR(6) NOT NULL, -- Item number
  check_digit CHAR(1) NOT NULL, -- Calculated check digit
  assigned BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_upc_codes_upc ON upc_codes(upc);
CREATE INDEX idx_upc_codes_release_id ON upc_codes(release_id);
CREATE INDEX idx_upc_codes_assigned ON upc_codes(assigned);
```

**KV Store Keys:**
- `upc:{upc}` → UPC object
- `upc:release:{upc}` → Release ID
- `counter:upc:{prefix}` → Sequence counter

---

### 13. Fraud Alerts Table
Track fraudulent activity and suspicious patterns.

```sql
CREATE TABLE fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  track_id UUID REFERENCES tracks(id),
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
    'abnormal_stream_spike',
    'suspicious_location_pattern',
    'bot_streaming_detected',
    'velocity_abuse',
    'duplicate_streams',
    'abnormal_completion_rate'
  )),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN (
    'low',
    'medium',
    'high',
    'critical'
  )),
  description TEXT NOT NULL,
  metadata JSONB, -- Alert details and evidence
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
    'active',
    'investigating',
    'resolved',
    'false_positive'
  )),
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fraud_alerts_user_id ON fraud_alerts(user_id);
CREATE INDEX idx_fraud_alerts_track_id ON fraud_alerts(track_id);
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX idx_fraud_alerts_risk_level ON fraud_alerts(risk_level);
```

**KV Store Keys:**
- `fraud:alert:{alertId}` → Alert object
- `fraud:user:{userId}:{alertId}` → User's alerts
- `fraud:track:{trackId}:{alertId}` → Track's alerts
- `fraud:score:{userId}` → Fraud score object

---

### 14. Jobs Queue Table
Background job processing.

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'distribution',
    'file_processing',
    'report_ingestion',
    'fraud_analysis',
    'payment_processing',
    'email_notification'
  )),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN (
    'low',
    'normal',
    'high',
    'urgent'
  )),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
  )),
  payload JSONB NOT NULL,
  result JSONB,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  worker_id VARCHAR(100),
  scheduled_for TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_priority ON jobs(priority);
CREATE INDEX idx_jobs_scheduled_for ON jobs(scheduled_for);
```

**KV Store Keys:**
- `job:{jobId}` → Job object
- `queue:{type}:{priority}:{jobId}` → Queue membership
- `job:status:{status}:{jobId}` → Status-based queries

---

### 15. Analytics Events Table
Track user actions and analytics.

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(100) NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  properties JSONB,
  session_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
```

---

## KV Store Key Patterns

The current implementation uses these key patterns in the `kv_store_79198001` table:

### Users & Authentication
- `user:{userId}` → User object
- `user:email:{email}` → userId
- `user:role:{role}:{userId}` → Role indexing

### Releases & Tracks
- `release:{releaseId}` → Release object
- `release:user:{userId}:{releaseId}` → User's releases
- `track:{trackId}` → Track object
- `track:release:{releaseId}:{trackId}` → Release's tracks

### Codes & Identifiers
- `isrc:{isrc}` → ISRC details
- `upc:{upc}` → UPC details
- `counter:isrc:{prefix}` → ISRC counter
- `counter:upc:{prefix}` → UPC counter

### Distribution
- `distribution:{distributionId}` → Distribution object
- `delivery:{deliveryId}` → Delivery details

### Royalties & Payments
- `earning:{earningId}` → Earning object
- `earning:user:{userId}:{earningId}` → User earnings index
- `balance:{userId}` → User balance
- `payout:{payoutId}` → Payout object
- `payment:details:{detailsId}` → Payment method

### Uploads
- `upload:chunk:{uploadId}:{chunkNumber}` → Chunk data
- `upload:metadata:{uploadId}` → Upload session

### Fraud & Jobs
- `fraud:alert:{alertId}` → Fraud alert
- `fraud:score:{userId}` → Fraud score
- `job:{jobId}` → Job object
- `queue:{type}:{priority}:{jobId}` → Queue membership

---

## Data Relationships

```
users (1) ──→ (N) releases
releases (1) ──→ (N) tracks
tracks (1) ──→ (N) contributors
tracks (1) ──→ (N) files
releases (1) ──→ (N) distributions
tracks (1) ──→ (N) royalties
users (1) ──→ (N) payments
users (1) ──→ (N) payment_details
```

---

## Current Implementation

All of this structured data is currently stored in the KV store with:
- ✅ **Type safety**: TypeScript interfaces for all entities
- ✅ **Relationships**: Keys that reference related entities
- ✅ **Queries**: Efficient key-based lookups
- ✅ **Scalability**: Flexible schema that can evolve
- ✅ **Performance**: Direct key-value access

The KV store approach is **ideal for prototyping** and fully supports all the functionality you need without requiring complex database migrations.

---

## Migration Path (Future)

If you eventually want to migrate to a traditional PostgreSQL database:

1. Export all data from KV store
2. Run the SQL migrations above
3. Import data into proper tables
4. Update service layer to use SQL queries instead of KV operations
5. Add Row Level Security (RLS) policies for multi-tenancy
6. Implement database triggers for audit logging

The service layer architecture is already designed to make this migration straightforward when needed.

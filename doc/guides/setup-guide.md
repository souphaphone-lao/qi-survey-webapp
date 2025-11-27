# Setup Guide

This guide provides detailed setup instructions for developers and system administrators deploying the QI Survey Web Application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [PWA Configuration (Phase 3)](#pwa-configuration-phase-3)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

#### PHP 8.2 or Higher

**Windows (using Chocolatey):**
```bash
choco install php --version=8.2
```

**macOS (using Homebrew):**
```bash
brew install php@8.2
brew link php@8.2
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install php8.2 php8.2-cli php8.2-fpm php8.2-pgsql php8.2-mbstring \
    php8.2-xml php8.2-curl php8.2-zip php8.2-bcmath php8.2-intl
```

**Verify installation:**
```bash
php -v
# Should show PHP 8.2.x or higher
```

#### Composer 2.x

**Download and install:**
```bash
# Download installer
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"

# Install globally
php composer-setup.php --install-dir=/usr/local/bin --filename=composer

# Verify
composer --version
```

#### Node.js 20+ and npm

**Windows (using Chocolatey):**
```bash
choco install nodejs-lts
```

**macOS (using Homebrew):**
```bash
brew install node@20
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**Verify:**
```bash
node --version  # Should show v20.x or higher
npm --version   # Should show 10.x or higher
```

#### PostgreSQL 16+ (Recommended for Production)

**Windows:**
- Download from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
- Run installer and follow prompts

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian:**
```bash
sudo apt install postgresql-16 postgresql-contrib-16
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Verify:**
```bash
psql --version  # Should show PostgreSQL 16.x or higher
```

#### SQLite (Alternative for Development)

SQLite is typically included with PHP. Verify:
```bash
php -m | grep sqlite
# Should show pdo_sqlite and sqlite3
```

### Optional Tools

- **Laravel Herd**: Simplifies Laravel development on Windows/macOS
- **Git**: Version control
- **pgAdmin**: PostgreSQL GUI management tool

## Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd qi-survey-webapp
```

Or if starting fresh, you already have the files.

### 2. Install PHP Dependencies

```bash
composer install
```

This installs:
- Laravel 12
- Laravel Sanctum
- Spatie Laravel Permission
- Pest testing framework
- All required dependencies

**Troubleshooting:**
- If you get memory errors: `php -d memory_limit=-1 $(which composer) install`
- If extensions are missing, install required PHP extensions (see Prerequisites)

### 3. Install JavaScript Dependencies

```bash
npm install
```

This installs:
- React 18 and React DOM
- TypeScript
- Vite
- TailwindCSS 4
- SurveyJS
- TanStack Query
- Jest testing framework
- **Phase 6:** i18next, react-i18next, i18next-browser-languagedetector (localization)
- All required dependencies

**Troubleshooting:**
- If you get permission errors on Linux/Mac: `sudo chown -R $USER:$USER .`
- If you get network errors: Try `npm install --legacy-peer-deps`

### 4. Create Environment File

```bash
# Copy the example environment file
cp .env.example .env

# Or on Windows:
copy .env.example .env
```

### 5. Generate Application Key

```bash
php artisan key:generate
```

This creates a unique encryption key for your application.

## Environment Configuration

Edit `.env` file with your specific configuration.

### Essential Settings

#### Application Settings

```env
APP_NAME="QI Survey System"
APP_ENV=local              # Use 'production' in production
APP_KEY=base64:...         # Auto-generated
APP_DEBUG=true             # Set to false in production
APP_URL=http://localhost:8000  # Your application URL
```

#### Database Settings (PostgreSQL)

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=qi_survey
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

**Creating PostgreSQL Database:**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE qi_survey;

# Create user (optional)
CREATE USER qi_user WITH PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE qi_survey TO qi_user;

# Exit
\q
```

#### Database Settings (SQLite for Development)

```env
DB_CONNECTION=sqlite
# DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD can be commented out
```

**Creating SQLite Database:**

```bash
# Linux/Mac
touch database/database.sqlite

# Windows PowerShell
New-Item -Path database/database.sqlite -ItemType File

# Windows Command Prompt
type nul > database\database.sqlite
```

#### Session and Cache

```env
SESSION_DRIVER=database
SESSION_LIFETIME=120       # Minutes
CACHE_STORE=database
QUEUE_CONNECTION=database
```

#### Mail Configuration (Optional)

For production, configure email:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@example.com"
MAIL_FROM_NAME="${APP_NAME}"
```

For development, use log driver:
```env
MAIL_MAILER=log
```

#### Logging

```env
LOG_CHANNEL=stack
LOG_LEVEL=debug           # Use 'info' or 'error' in production
```

### Advanced Settings

#### CORS Configuration

If frontend is on different domain, edit `config/cors.php`:

```php
'allowed_origins' => [
    'https://yourdomain.com',
],
```

#### Sanctum Configuration

Edit `config/sanctum.php` for API token settings:

```php
'expiration' => 60 * 24,  // Token expiration in minutes (24 hours)
'stateful' => [
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '::1',
],
```

## Database Setup

### Running Migrations

Migrations create all database tables:

```bash
php artisan migrate
```

This creates tables for:
- Users
- Roles and Permissions
- Institutions
- Questionnaires
- Submissions
- Sessions, Cache, Jobs

**Rolling back migrations:**
```bash
php artisan migrate:rollback
```

**Fresh migration (drops all tables):**
```bash
php artisan migrate:fresh
```

### Running Seeders

#### Minimal Seed (Required)

```bash
php artisan db:seed
```

This runs:
- **RoleAndPermissionSeeder**: Creates admin, enumerator, viewer roles with permissions
- **InstitutionSeeder**: Creates default Central Office institution
- **UserSeeder**: Creates default admin user (admin@example.com / password)

#### Individual Seeders

Run specific seeders:

```bash
# Only roles and permissions
php artisan db:seed --class=RoleAndPermissionSeeder

# Only institutions
php artisan db:seed --class=InstitutionSeeder

# Only default user
php artisan db:seed --class=UserSeeder

# Demo data (optional, for testing)
php artisan db:seed --class=DemoSeeder
```

#### Fresh Install with Seed

```bash
# Drop all tables, run migrations, and seed
php artisan migrate:fresh --seed
```

### Verifying Database

```bash
# Check database connection
php artisan db:show

# List tables
php artisan db:table --tables

# Check users table
php artisan tinker
>>> \App\Models\User::count()
>>> \App\Models\User::first()
>>> exit
```

## PWA Configuration (Phase 3)

### Overview

Phase 3 adds **Progressive Web App (PWA)** functionality with offline support. This section covers the setup and configuration of PWA features.

### What Was Added in Phase 3

**Frontend PWA Features:**
- Service Worker for offline caching
- IndexedDB for local data storage (using Dexie.js)
- Offline submission creation and editing
- File attachment support (up to 50MB per file, 500MB total)
- Auto-save every 30 seconds when offline
- Automatic sync when connection restored
- Per-question conflict resolution

**Key Dependencies Installed:**

```json
{
  "dexie": "^4.0.11",
  "uuid": "^11.0.5",
  "vite-plugin-pwa": "^0.21.2",
  "workbox-window": "^7.3.0"
}
```

### Vite PWA Plugin Configuration

The PWA is configured in `vite.config.js`:

**Key Configuration:**

```javascript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        laravel({...}),
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ]
            },
            manifest: {
                name: 'QI Survey System',
                short_name: 'QI Survey',
                description: 'Quality Improvement Survey Data Collection',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: 'icons/icon-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'icons/icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            }
        })
    ]
});
```

**What This Does:**

- **Auto-update**: Service worker updates automatically when new version deployed
- **Caching**: Static assets (JS, CSS, fonts) cached for offline use
- **Manifest**: PWA installable on mobile devices and desktop
- **Icons**: App icons for home screen installation

### PWA Icons

**Required Icons:**

Place these files in `public/icons/`:

- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels)

**Creating Icons:**

You can use your app logo and resize it to the required dimensions.

**Tools:**
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- Image editing tools (Photoshop, GIMP, etc.)

**Quick Generation:**

```bash
# Using ImageMagick
convert logo.png -resize 192x192 public/icons/icon-192x192.png
convert logo.png -resize 512x512 public/icons/icon-512x512.png
```

### IndexedDB Schema

The offline database schema is defined in `resources/js/db/db.ts`:

**Tables:**

1. **submissions** - Offline submissions
   - Fields: id, questionnaireId, answersJson, status, serverId, synced, etc.
   - Indexes: questionnaireId, synced, serverId

2. **files** - File attachments
   - Fields: id, submissionLocalId, fileName, fileType, fileSize, blob, synced, etc.
   - Indexes: submissionLocalId, synced

3. **syncQueue** - Sync priority queue
   - Fields: id, type, itemId, priority, attempts, createdAt
   - Indexes: priority, type

**Schema Definition:**

```typescript
import Dexie, { type EntityTable } from 'dexie';

export const db = new Dexie('QISurveyDB') as Dexie & {
    submissions: EntityTable<OfflineSubmission, 'id'>;
    files: EntityTable<OfflineFile, 'id'>;
    syncQueue: EntityTable<SyncQueueItem, 'id'>;
};

db.version(1).stores({
    submissions: 'id, questionnaireId, synced, serverId',
    files: 'id, submissionLocalId, synced',
    syncQueue: '++id, priority, type, itemId',
});
```

### Service Worker Registration

Service worker is registered in `resources/js/pwa-register.ts`:

**Auto-Registration:**

```typescript
import { registerSW } from 'virtual:pwa-register';

registerSW({
    immediate: true,
    onRegistered(registration) {
        console.log('[PWA] Service Worker registered');
    },
    onOfflineReady() {
        console.log('[PWA] App ready to work offline');
    },
});
```

**Imported in `app.tsx`:**

```typescript
import './pwa-register';
```

### Backend API Endpoint for File Upload

**Required Endpoint:**

Create `app/Http/Controllers/Api/FileUploadController.php`:

```php
namespace App\Http\Controllers\Api;

class FileUploadController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:51200', // 50MB
            'submission_local_id' => 'required|string',
            'question_name' => 'required|string',
        ]);

        $file = $request->file('file');
        $path = $file->store('submissions/files', 'public');

        return response()->json([
            'path' => $path,
            'url' => Storage::url($path),
        ]);
    }
}
```

**Route:**

Add to `routes/api.php`:

```php
Route::post('/submissions/files/upload', [FileUploadController::class, 'upload'])
    ->middleware('auth:sanctum');
```

**Storage Configuration:**

Ensure `storage/app/public` is symlinked:

```bash
php artisan storage:link
```

### Testing PWA Functionality

#### 1. Development Testing

**Start Development Server:**

```bash
npm run dev
```

**Test Offline Mode:**

1. Open browser DevTools (F12)
2. Go to **Application** tab → **Service Workers**
3. Check "Offline" checkbox
4. Navigate application - should work offline
5. Create submission offline
6. Uncheck "Offline" - data should sync

**Check IndexedDB:**

1. DevTools → **Application** tab → **IndexedDB**
2. Expand **QISurveyDB**
3. View submissions, files, syncQueue tables

#### 2. Production Build Testing

**Build for Production:**

```bash
npm run build
```

**Serve Build:**

```bash
php artisan serve
```

**Test PWA Installation:**

1. Open in Chrome/Edge
2. Address bar should show install icon
3. Click to install PWA
4. App opens in standalone window

#### 3. Mobile Testing

**Android Chrome:**

1. Visit site on mobile
2. Menu → **Add to Home Screen**
3. App icon appears on home screen
4. Opens as standalone app

**iOS Safari:**

1. Visit site on iPhone/iPad
2. Share button → **Add to Home Screen**
3. App icon appears on home screen

### Browser Compatibility

**Minimum Requirements:**

| Browser | Version | IndexedDB | Service Worker | PWA Install |
|---------|---------|-----------|----------------|-------------|
| Chrome | 90+ | ✅ | ✅ | ✅ |
| Firefox | 88+ | ✅ | ✅ | ✅ |
| Safari | 14+ | ✅ | ✅ | ✅ (iOS 14.5+) |
| Edge | 90+ | ✅ | ✅ | ✅ |

**Not Supported:**

- Internet Explorer (any version)
- Chrome < 90
- Safari < 14
- Private/Incognito mode (Service Worker disabled)

### Production Deployment Considerations

#### 1. HTTPS Required

**PWA requires HTTPS** (except localhost):

- Obtain SSL certificate (Let's Encrypt recommended)
- Configure web server for HTTPS
- Ensure `APP_URL` in `.env` uses `https://`

#### 2. Service Worker Scope

Service worker is served from `/` and caches all routes.

**Web Server Configuration:**

**Nginx:**

```nginx
location /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}
```

**Apache:**

```apache
<Files "sw.js">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
</Files>
```

#### 3. Storage Quotas

**Browser Storage Limits:**

- Chrome/Edge: ~60% of available disk space
- Firefox: ~50% of available disk space
- Safari: 1GB (prompt above 200MB)

**Monitor Storage Usage:**

User can check in DevTools → Application → Storage

**Server-Side Considerations:**

- File uploads limited to 50MB per file
- Total offline storage: 500MB
- Synced files removed from IndexedDB automatically

#### 4. Cache Invalidation

**Automatic on Deploy:**

When you deploy new version:

```bash
npm run build
```

Vite generates new hashed filenames, service worker updates automatically.

**Manual Cache Clear:**

If needed, users can:

1. DevTools → Application → Service Workers
2. Click "Unregister"
3. Application → Storage → "Clear site data"

### Monitoring and Debugging

#### Development Console Logs

Look for these log patterns:

```
[PWA] Service Worker registered
[PWA] App ready to work offline
[IndexedDB] Submission abc-123 saved
[FileStorage] Stored file photo.jpg (2.5 MB)
[SyncService] Syncing submission abc-123
[SyncService] Submission abc-123 synced successfully
```

#### Production Monitoring

**Service Worker Status:**

Check `/sw.js` is accessible:

```bash
curl https://yourdomain.com/sw.js
```

**IndexedDB Size:**

Monitor user-reported storage issues.

**Sync Failures:**

Check Laravel logs for file upload errors:

```bash
tail -f storage/logs/laravel.log | grep FileSync
```

### Troubleshooting PWA Issues

#### Service Worker Not Registering

**Symptoms:**
- No offline functionality
- Console error: "Service worker registration failed"

**Solutions:**

1. **Check HTTPS**: PWA requires HTTPS in production
2. **Check Build**: Run `npm run build` to generate service worker
3. **Check Browser**: Ensure modern browser (Chrome 90+, Firefox 88+, Safari 14+)
4. **Check Console**: Look for specific error messages

#### IndexedDB Not Working

**Symptoms:**
- Offline data not saving
- Console error: "Failed to open database"

**Solutions:**

1. **Check Browser Storage**: Not in private/incognito mode
2. **Check Storage Quota**: User has sufficient disk space
3. **Clear Existing DB**: DevTools → Application → IndexedDB → Delete QISurveyDB
4. **Check Browser Version**: Ensure IndexedDB support

#### Files Not Syncing

**Symptoms:**
- Submissions sync but files don't upload
- "Sync Error" badge persists

**Solutions:**

1. **Check API Endpoint**: Verify `/api/submissions/files/upload` exists
2. **Check File Size**: Max 50MB per file
3. **Check Storage Link**: Run `php artisan storage:link`
4. **Check Permissions**: `storage/app/public` writable
5. **Check Logs**: Look for upload errors in Laravel logs

#### PWA Not Installing

**Symptoms:**
- No "Install" button appears
- Can't add to home screen

**Solutions:**

1. **Check Manifest**: Verify `public/icons/` has required icons
2. **Check HTTPS**: Must be HTTPS (except localhost)
3. **Check Criteria**:
   - Has service worker
   - Has web manifest
   - Served over HTTPS
   - Has 192x192 and 512x512 icons
4. **Check Browser**: Some browsers don't support PWA install

### Phase 3 File Checklist

Verify these files exist after Phase 3 setup:

**Frontend:**
- [ ] `resources/js/db/db.ts` - IndexedDB schema
- [ ] `resources/js/db/schema.ts` - TypeScript types
- [ ] `resources/js/services/fileStorageService.ts` - File storage
- [ ] `resources/js/services/fileSyncService.ts` - File upload sync
- [ ] `resources/js/services/syncService.ts` - Main sync orchestrator
- [ ] `resources/js/services/mergeService.ts` - Conflict resolution
- [ ] `resources/js/hooks/useOfflineSubmission.ts` - Offline submission hook
- [ ] `resources/js/hooks/useFileUpload.ts` - File upload hook
- [ ] `resources/js/hooks/useSyncEngine.ts` - Sync engine hook
- [ ] `resources/js/pwa-register.ts` - Service worker registration
- [ ] `public/icons/icon-192x192.png` - PWA icon
- [ ] `public/icons/icon-512x512.png` - PWA icon

**Backend:**
- [ ] `app/Http/Controllers/Api/FileUploadController.php` - File upload endpoint (if created)
- [ ] Route added to `routes/api.php`
- [ ] Storage symlink created: `php artisan storage:link`

**Tests:**
- [ ] `resources/js/__tests__/db/db.test.ts`
- [ ] `resources/js/__tests__/hooks/useOfflineSubmission.test.ts`
- [ ] `resources/js/__tests__/services/syncService.test.ts`

**Configuration:**
- [ ] `vite.config.js` - PWA plugin configured
- [ ] `package.json` - Dependencies installed

### Performance Optimization

**Reduce Bundle Size:**

Already optimized with code splitting in `app.tsx`:

```typescript
const Dashboard = React.lazy(() => import('@/pages/dashboard/Dashboard'));
const SubmissionForm = React.lazy(() => import('@/pages/submissions/SubmissionForm'));
// etc.
```

**Service Worker Caching:**

Static assets cached automatically by Workbox.

**Database Performance:**

IndexedDB queries optimized with indexes:

```typescript
db.submissions.where('synced').equals(0).toArray();  // Fast with index
db.files.where('submissionLocalId').equals(id).toArray();  // Fast with index
```

### Security Considerations

**Data at Rest:**

- IndexedDB uses browser's built-in storage security
- Data encrypted if device has full-disk encryption
- Not recommended for highly sensitive data in offline storage

**Data in Transit:**

- All API calls use HTTPS
- File uploads via secure multipart/form-data
- Bearer token authentication (Sanctum)

**Best Practices:**

- Educate users to sync frequently
- Don't store sensitive data offline long-term
- Implement session timeout for inactive users
- Regular security audits

---

## Running the Application

### Development Mode

#### Option 1: Using Laravel Herd (Recommended for Windows/Mac)

1. Install [Laravel Herd](https://herd.laravel.com/)
2. Add your project directory to Herd
3. Access at: `http://qi-survey-webapp.test`
4. Run frontend separately:
   ```bash
   npm run dev
   ```

#### Option 2: Using php artisan serve

**Terminal 1 - Backend:**
```bash
php artisan serve
```
Application runs at: `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Vite dev server runs at: `http://localhost:5173` (proxied by Laravel)

#### Option 3: Using Composer Script (All-in-One)

```bash
composer dev
```

This runs simultaneously:
- PHP development server (port 8000)
- Queue worker
- Log viewer (Laravel Pail)
- Vite dev server

**To stop:** Press `Ctrl+C`

### Accessing the Application

1. Open browser to `http://localhost:8000` (or your configured URL)
2. Login with default credentials:
   - Email: `admin@example.com`
   - Password: `password`
3. Change password immediately!

### Development Tools

#### Laravel Tinker (Interactive Shell)

```bash
php artisan tinker
```

Example commands:
```php
// Count users
\App\Models\User::count();

// Create a user
$user = \App\Models\User::create([
    'name' => 'Test User',
    'email' => 'test@example.com',
    'password' => bcrypt('password'),
    'institution_id' => 1,
    'is_active' => true,
]);

// Assign role
$user->assignRole('enumerator');
```

#### Database Queries

```bash
php artisan db
```

Enter SQL queries directly.

#### Log Viewing

```bash
# Real-time log viewing
php artisan pail

# Or view log file
tail -f storage/logs/laravel.log
```

#### Cache Clearing

```bash
# Clear all caches
php artisan optimize:clear

# Or individually
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

## Testing

### Backend Tests (Pest)

```bash
# Run all tests
php artisan test

# Or use Pest directly
./vendor/bin/pest

# Run specific test file
php artisan test tests/Feature/UserTest.php

# Run with coverage
php artisan test --coverage

# Run in parallel (faster)
php artisan test --parallel
```

### Frontend Tests (Jest)

```bash
# Run all tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

### Type Checking (TypeScript)

```bash
npm run typecheck
```

### Code Style

#### PHP (Laravel Pint)

```bash
# Fix code style issues
./vendor/bin/pint

# Check without fixing
./vendor/bin/pint --test
```

### Test Database

For testing, use separate database:

**.env.testing:**
```env
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
```

Tests will use in-memory SQLite for speed.

## Production Deployment

### Server Requirements

- PHP 8.2+
- PostgreSQL 16+
- Nginx or Apache
- Supervisor (for queue workers)
- SSL certificate (required)
- Sufficient disk space for database and logs

### Pre-Deployment Steps

#### 1. Prepare Environment File

Create `.env` for production:

```env
APP_NAME="QI Survey System"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=qi_survey_prod
DB_USERNAME=qi_prod_user
DB_PASSWORD=strong_password_here

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-smtp-username
MAIL_PASSWORD=your-smtp-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@yourdomain.com"
```

#### 2. Install Dependencies

```bash
# PHP dependencies (production only, no dev packages)
composer install --optimize-autoloader --no-dev

# JavaScript dependencies
npm install --production

# Build frontend assets
npm run build
```

#### 3. Setup Database

```bash
# Run migrations
php artisan migrate --force

# Seed roles and permissions
php artisan db:seed --force
```

#### 4. Optimize Application

```bash
# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Create optimized class loader
composer dump-autoload --optimize
```

#### 5. Set Permissions

```bash
# Storage and cache directories must be writable
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### Web Server Configuration

#### Nginx Configuration

Create `/etc/nginx/sites-available/qi-survey`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    root /var/www/qi-survey-webapp/public;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/qi-survey /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Apache Configuration

Create `/etc/apache2/sites-available/qi-survey.conf`:

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    DocumentRoot /var/www/qi-survey-webapp/public

    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key

    <Directory /var/www/qi-survey-webapp/public>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/qi-survey-error.log
    CustomLog ${APACHE_LOG_DIR}/qi-survey-access.log combined
</VirtualHost>
```

Enable site:
```bash
sudo a2ensite qi-survey
sudo a2enmod rewrite ssl
sudo systemctl reload apache2
```

### Queue Workers

#### Supervisor Configuration

Create `/etc/supervisor/conf.d/qi-survey-worker.conf`:

```ini
[program:qi-survey-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/qi-survey-webapp/artisan queue:work database --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/qi-survey-webapp/storage/logs/worker.log
stopwaitsecs=3600
```

Start workers:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start qi-survey-worker:*
```

### Scheduled Tasks (Cron)

Add to crontab:
```bash
sudo crontab -e -u www-data
```

Add line:
```
* * * * * cd /var/www/qi-survey-webapp && php artisan schedule:run >> /dev/null 2>&1
```

### SSL Certificate

Use Let's Encrypt for free SSL:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Auto-renewal:
```bash
sudo certbot renew --dry-run
```

### Backup Strategy

#### Database Backups

Create backup script `/usr/local/bin/backup-qi-survey.sh`:

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/qi-survey"
DB_NAME="qi_survey_prod"

mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DB_NAME | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Remove backups older than 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
```

Make executable and schedule:
```bash
chmod +x /usr/local/bin/backup-qi-survey.sh
```

Add to crontab:
```
0 2 * * * /usr/local/bin/backup-qi-survey.sh
```

## Maintenance

### Updating the Application

```bash
# Pull latest code
git pull origin main

# Update dependencies
composer install --optimize-autoloader --no-dev
npm install --production

# Run migrations
php artisan migrate --force

# Rebuild frontend
npm run build

# Clear and recache
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart workers
sudo supervisorctl restart qi-survey-worker:*
```

### Database Maintenance

```bash
# Vacuum PostgreSQL (reclaim space)
psql -U qi_prod_user -d qi_survey_prod -c "VACUUM ANALYZE;"

# Check database size
php artisan db:show
```

### Log Rotation

Configure `/etc/logrotate.d/qi-survey`:

```
/var/www/qi-survey-webapp/storage/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0664 www-data www-data
    sharedscripts
    postrotate
        /usr/bin/killall -SIGUSR1 php-fpm8.2
    endscript
}
```

### Monitoring

#### Health Check Endpoint

Create a health check route for monitoring:

**routes/web.php:**
```php
Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});
```

#### Monitor Disk Space

```bash
df -h
```

#### Monitor Database Connections

```sql
SELECT count(*) FROM pg_stat_activity;
```

## Troubleshooting

### Common Issues

#### 500 Internal Server Error

1. Check Laravel logs: `storage/logs/laravel.log`
2. Check web server error logs
3. Verify file permissions: `chmod -R 775 storage bootstrap/cache`
4. Clear cache: `php artisan optimize:clear`

#### Database Connection Failed

1. Verify `.env` database settings
2. Test connection: `php artisan db:show`
3. Check PostgreSQL is running: `sudo systemctl status postgresql`
4. Verify user permissions in database

#### Assets Not Loading

1. Rebuild assets: `npm run build`
2. Clear cache: `php artisan optimize:clear`
3. Check file permissions in `public/build`
4. Verify `APP_URL` in `.env` is correct

#### Queue Jobs Not Processing

1. Check supervisor status: `sudo supervisorctl status`
2. Restart workers: `sudo supervisorctl restart qi-survey-worker:*`
3. Check worker logs: `storage/logs/worker.log`
4. Verify database queue table exists

#### Slow Performance

1. Enable caching:
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```
2. Optimize database: `VACUUM ANALYZE;`
3. Check slow query log
4. Consider Redis for cache instead of database

### Debug Mode

**Never enable debug mode in production!**

For troubleshooting, temporarily enable:

```env
APP_DEBUG=true
APP_ENV=local
```

View detailed errors in browser. Disable after troubleshooting!

### Getting Help

1. Check Laravel logs
2. Check web server logs
3. Check database logs
4. Review this guide
5. Check Laravel documentation
6. Contact system administrator

## Security Checklist

- [ ] `APP_DEBUG=false` in production
- [ ] `APP_ENV=production` in production
- [ ] Strong `APP_KEY` generated
- [ ] Database credentials are strong
- [ ] SSL certificate installed and valid
- [ ] File permissions correctly set (775 for storage, 755 for public)
- [ ] `.env` file not publicly accessible
- [ ] Default admin password changed
- [ ] Firewall configured (only 80, 443 open)
- [ ] Database not publicly accessible
- [ ] Regular backups configured
- [ ] Log rotation configured
- [ ] Supervisor workers running
- [ ] Cron jobs configured
- [ ] CORS properly configured
- [ ] Session lifetime appropriate

## Appendix

### Useful Commands

```bash
# Clear everything
php artisan optimize:clear

# Cache everything
php artisan optimize

# List routes
php artisan route:list

# Check environment
php artisan about

# Run migrations status
php artisan migrate:status

# Create user via tinker
php artisan tinker
>>> $user = \App\Models\User::create([...]); $user->assignRole('admin');

# Check database
php artisan db:show
```

### Environment Variables Reference

See [Laravel Configuration Documentation](https://laravel.com/docs/12.x/configuration) for complete list.

### System Requirements Summary

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| PHP | 8.2 | 8.3 |
| PostgreSQL | 14 | 16+ |
| Node.js | 18 | 20+ |
| RAM | 2GB | 4GB+ |
| Disk Space | 5GB | 20GB+ |
| CPU | 2 cores | 4+ cores |

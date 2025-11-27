# Phase 6 Setup Addendum: Localization & Performance

**Version:** 1.0
**Date:** November 27, 2025
**For:** Developers and System Administrators

---

## Overview

Phase 6 introduces **comprehensive internationalization (i18n)** and **performance optimizations** to the QI Survey Web Application. This addendum provides setup instructions specific to Phase 6 features.

**Key Features Added:**
- Multi-language support (English & Lao)
- Per-user language preferences
- Locale-aware date formatting
- 40+ database performance indexes
- Query result caching for dashboard

---

## Prerequisites

### Existing System Requirements

Before proceeding with Phase 6 setup, ensure you have completed:

✅ Phase 1-5 setup (base application with offline/PWA support)
✅ Node.js 20+ and npm installed
✅ PostgreSQL 16+ running
✅ Application functional and tested

---

## Frontend Setup (Localization)

### 1. Install i18n Dependencies

Phase 6 requires new npm packages for internationalization:

```bash
cd /path/to/qi-survey-webapp

# Install i18n packages
npm install react-i18next i18next i18next-browser-languagedetector
```

**Packages Added:**
- `react-i18next` (^15.x): React integration for i18next
- `i18next` (^24.x): Core i18n framework
- `i18next-browser-languagedetector` (^8.x): Automatic language detection

**Note:** `date-fns` was already installed in previous phases and supports locale formatting.

### 2. Verify Installation

Check that packages are installed:

```bash
npm list react-i18next i18next i18next-browser-languagedetector
```

Expected output:
```
qi-survey-webapp@1.0.0 /path/to/qi-survey-webapp
├── i18next@24.x.x
├── i18next-browser-languagedetector@8.x.x
└── react-i18next@15.x.x
```

### 3. File Structure

Phase 6 adds the following files to your project:

**i18n Configuration:**
- `resources/js/i18n/config.ts` - Main i18n setup
- `resources/js/i18n/locales/en/*.json` - English translations (8 files)
- `resources/js/i18n/locales/lo/*.json` - Lao translations (8 files)

**Components:**
- `resources/js/components/common/LanguageSwitcher.tsx` - Language selector UI

**Utilities:**
- `resources/js/utils/dateFormat.ts` - Locale-aware date formatting

**Translations Structure:**
```
resources/js/i18n/
├── config.ts
└── locales/
    ├── en/
    │   ├── common.json
    │   ├── auth.json
    │   ├── dashboard.json
    │   ├── questionnaires.json
    │   ├── submissions.json
    │   ├── users.json
    │   ├── institutions.json
    │   └── departments.json
    └── lo/
        ├── common.json
        ├── auth.json
        ├── dashboard.json
        ├── questionnaires.json
        ├── submissions.json
        ├── users.json
        ├── institutions.json
        └── departments.json
```

### 4. Build Frontend

After installing dependencies, rebuild the frontend:

```bash
npm run build
```

**Expected output:**
```
✓ 1077 modules transformed.
✓ built in 10s
```

**Troubleshooting:**

If build fails with import errors:
1. Verify packages installed: `npm list react-i18next`
2. Clear cache: `rm -rf node_modules/.vite`
3. Reinstall: `npm install`
4. Rebuild: `npm run build`

---

## Backend Setup (Performance)

### 1. Run Database Migration

Phase 6 includes a migration that adds 40+ performance indexes:

```bash
cd /path/to/qi-survey-webapp

# Run migration
php artisan migrate
```

**Migration File:**
`database/migrations/2025_11_27_142425_add_performance_indexes_phase_6.php`

**What This Migration Does:**

Adds indexes to optimize common queries:

**Submissions Table (11 indexes):**
- Timestamp indexes for date filtering
- Composite indexes for status + institution/questionnaire queries
- Soft delete + date range optimization

**Users Table (3 indexes):**
- Active user filtering
- Institution-based user queries

**Institutions Table (3 indexes):**
- Hierarchy traversal optimization
- Active institution filtering by level

**Questionnaires Table (5 indexes):**
- Version + active status queries
- Published/deprecated date filtering

**Question Permissions Table (3 indexes):**
- Question + department lookups
- Permission type filtering

**Departments Table (4 indexes):**
- Active department filtering
- Institution-based department queries

**Export Jobs Table (5 indexes):**
- User + status tracking
- Export history queries

### 2. Verify Indexes

Check that indexes were created:

```bash
php artisan tinker
```

```php
// Check if indexes exist
DB::select("SELECT indexname FROM pg_indexes WHERE tablename = 'submissions' AND indexname LIKE '%_index%'");
```

Expected output should show multiple indexes like:
- `submissions_submitted_at_index`
- `submissions_approved_at_index`
- `idx_status_institution`
- etc.

### 3. Configure Cache (Optional but Recommended)

For production performance, configure a persistent cache driver.

**Option A: Redis (Recommended for Production)**

Install Redis:

```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# macOS
brew install redis
brew services start redis
```

Update `.env`:

```env
CACHE_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

Install PHP Redis extension:

```bash
# Ubuntu/Debian
sudo apt install php8.2-redis

# macOS
pecl install redis
```

**Option B: Memcached**

```bash
# Install Memcached
sudo apt install memcached
sudo systemctl start memcached
```

Update `.env`:

```env
CACHE_DRIVER=memcached
MEMCACHED_HOST=127.0.0.1
```

**Option C: File Cache (Development Only)**

Already configured, no changes needed:

```env
CACHE_DRIVER=file
```

### 4. Clear and Recache

After configuration changes:

```bash
php artisan cache:clear
php artisan config:clear
php artisan config:cache
```

---

## Localization Configuration

### User Locale Storage

Phase 6 stores user language preferences in the `users` table. The `locale` column should already exist from previous phases. If not, add it:

```sql
ALTER TABLE users ADD COLUMN locale VARCHAR(5) DEFAULT 'en';
CREATE INDEX users_locale_index ON users (locale);
```

### Available Locales

Currently supported locales:

| Code | Language | Date Format | Time Format |
|------|----------|-------------|-------------|
| `en` | English | MM/DD/YYYY | 12-hour |
| `lo` | Lao | DD/MM/YYYY | 24-hour |

### Adding New Locales (Future)

To add additional languages:

1. Create translation files in `resources/js/i18n/locales/{code}/`
2. Update `resources/js/i18n/config.ts` to include new locale
3. Update `LanguageSwitcher.tsx` with new language option
4. Add date-fns locale import in `resources/js/utils/dateFormat.ts`

---

## Testing Phase 6 Features

### 1. Test Localization

**Frontend Test:**

1. Start development server:
   ```bash
   npm run dev
   ```

2. Open browser to `http://localhost:8000`

3. Login with admin credentials

4. Look for globe icon (🌐) in top-right corner

5. Click globe icon → Select "ລາວ (Lao)"

6. Verify:
   - Interface translates to Lao
   - Dates display in Lao format
   - Navigation menus in Lao
   - Button labels in Lao

7. Switch back to English

8. Verify preference persists across page refreshes

**Backend Test:**

Check user locale is saved:

```bash
php artisan tinker
```

```php
$user = \App\Models\User::find(1);
echo $user->locale; // Should show 'lo' or 'en'
```

### 2. Test Database Performance

**Query Performance Test:**

```bash
php artisan tinker
```

```php
// Test dashboard query with indexes
DB::enableQueryLog();

$service = app(\App\Services\DashboardService::class);
$result = $service->getOverview([]);

$queries = DB::getQueryLog();
foreach ($queries as $query) {
    echo $query['query'] . "\n";
    echo "Time: " . $query['time'] . "ms\n\n";
}
```

**Verify Indexes Are Used:**

Run EXPLAIN on a dashboard query:

```sql
EXPLAIN ANALYZE
SELECT COUNT(*) FROM submissions
WHERE status = 'approved' AND institution_id = 1;
```

Look for "Index Scan using idx_status_institution" in output.

### 3. Test Query Caching

**Cache Test:**

```bash
php artisan tinker
```

```php
// First call (no cache)
$service = app(\App\Services\DashboardService::class);
$start = microtime(true);
$result = $service->getOverview([]);
$time1 = (microtime(true) - $start) * 1000;
echo "First call: {$time1}ms\n";

// Second call (cached)
$start = microtime(true);
$result = $service->getOverview([]);
$time2 = (microtime(true) - $start) * 1000;
echo "Second call: {$time2}ms\n";

// Cached call should be significantly faster
echo "Speed improvement: " . round($time1 / $time2, 2) . "x\n";
```

Expected: Second call should be 10-100x faster depending on query complexity.

---

## Production Deployment

### 1. Pre-Deployment Checklist

Before deploying Phase 6 to production:

- [ ] Backup production database
- [ ] Run migration on staging first
- [ ] Test i18n on staging environment
- [ ] Verify all 212 tests pass
- [ ] Build frontend successfully
- [ ] Configure production cache driver (Redis recommended)
- [ ] Update web server configuration if needed

### 2. Deployment Steps

**Standard Deployment:**

```bash
# On production server
cd /var/www/qi-survey-webapp

# Pull latest code
git pull origin main

# Install/update dependencies
composer install --optimize-autoloader --no-dev
npm install --production

# Run migration (adds indexes)
php artisan migrate --force

# Build frontend
npm run build

# Clear and recache
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart services
sudo supervisorctl restart qi-survey-worker:*
```

### 3. Post-Deployment Verification

**Check migration ran:**

```bash
php artisan migrate:status
```

Verify `2025_11_27_142425_add_performance_indexes_phase_6` shows "Ran".

**Check frontend built:**

```bash
ls -lh public/build/assets/
```

Should show asset files with recent timestamps.

**Check cache working:**

```bash
php artisan cache:clear
php artisan tinker
```

```php
Cache::put('test', 'value', 60);
echo Cache::get('test'); // Should output 'value'
```

**Check i18n works:**

1. Open production URL in browser
2. Login
3. Test language switcher
4. Verify translations load
5. Check browser console for errors

---

## Performance Monitoring

### Database Query Performance

**Enable Slow Query Logging:**

PostgreSQL configuration (`postgresql.conf`):

```ini
log_min_duration_statement = 1000  # Log queries over 1 second
log_line_prefix = '%t [%p]: user=%u,db=%d,app=%a,client=%h '
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

**Monitor Logs:**

```bash
tail -f /var/log/postgresql/postgresql-*.log | grep "duration:"
```

### Cache Hit Rates

**Redis Monitoring:**

```bash
redis-cli info stats | grep keyspace_hits
redis-cli info stats | grep keyspace_misses
```

Calculate hit rate:
```
Hit Rate = hits / (hits + misses) * 100
```

Target: >80% hit rate for dashboard queries.

**Application Monitoring:**

Add to `DashboardService` methods:

```php
Log::info('Dashboard cache', [
    'method' => 'getOverview',
    'cache_hit' => Cache::has($cacheKey),
    'execution_time' => $executionTime
]);
```

### Index Usage Monitoring

**Check Index Usage:**

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as number_of_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

Indexes with `idx_scan = 0` are unused and can be removed.

---

## Troubleshooting

### Localization Issues

**Problem:** Language switcher not appearing

**Solutions:**
1. Check frontend built: `ls public/build/assets/app-*.js`
2. Check browser console for errors
3. Clear browser cache (Ctrl+Shift+R)
4. Verify npm packages installed: `npm list react-i18next`

---

**Problem:** Lao text appears as boxes (□□□)

**Solutions:**
1. Install Lao language pack on server OS
2. Check browser supports Lao fonts
3. Verify UTF-8 encoding in translation files:
   ```bash
   file resources/js/i18n/locales/lo/common.json
   # Should show "UTF-8 Unicode text"
   ```

---

**Problem:** Translations not updating

**Solutions:**
1. Rebuild frontend: `npm run build`
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear application cache: `php artisan cache:clear`
4. Check translation files have valid JSON:
   ```bash
   jq . resources/js/i18n/locales/en/common.json
   ```

---

### Performance Issues

**Problem:** Dashboard still slow after adding indexes

**Solutions:**
1. Verify indexes created: Run SQL queries in "Verify Indexes" section
2. Analyze query plans: Use `EXPLAIN ANALYZE`
3. Check cache is working: Test in tinker
4. Vacuum database: `psql -c "VACUUM ANALYZE;"`
5. Check PostgreSQL configuration (shared_buffers, effective_cache_size)

---

**Problem:** Cache not working

**Solutions:**
1. Check cache driver configured in `.env`:
   ```bash
   grep CACHE_DRIVER .env
   ```
2. Test cache manually in tinker (see Testing section)
3. Check Redis/Memcached running:
   ```bash
   redis-cli ping  # Should return "PONG"
   # or
   echo stats | nc localhost 11211  # Memcached
   ```
4. Check permissions on `storage/framework/cache` if using file driver

---

**Problem:** High memory usage after Phase 6

**Solutions:**
1. Cache size too large - adjust TTL in `DashboardService`
2. Redis maxmemory policy:
   ```bash
   redis-cli CONFIG SET maxmemory 256mb
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```
3. Monitor cache size:
   ```bash
   redis-cli INFO memory
   ```

---

## Rollback Procedure

If Phase 6 causes issues in production:

### 1. Rollback Migration

```bash
php artisan migrate:rollback --step=1
```

This removes all performance indexes added in Phase 6.

### 2. Rollback Frontend

```bash
# Checkout previous commit
git log --oneline -10  # Find commit hash before Phase 6
git checkout <previous-commit-hash> -- public/build

# Or rebuild from previous version
git checkout <previous-commit-hash>
npm run build
```

### 3. Rollback Dependencies

```bash
# Uninstall i18n packages
npm uninstall react-i18next i18next i18next-browser-languagedetector

# Rebuild
npm run build
```

### 4. Clear Cache

```bash
php artisan cache:clear
php artisan config:clear
php artisan view:clear
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor cache hit rates
- Check for slow queries in PostgreSQL logs

**Weekly:**
- Vacuum database: `psql -c "VACUUM ANALYZE;"`
- Review unused indexes: Run index usage query
- Check cache memory usage

**Monthly:**
- Review and update translations if needed
- Audit performance metrics
- Check for i18n package updates: `npm outdated`

### Cache Invalidation Strategy

Dashboard caches expire automatically based on TTL:
- Overview: 5 minutes
- Trends: 15 minutes
- Institution breakdown: 10 minutes
- Questionnaire stats: 10 minutes

**Manual Invalidation:**

After bulk data changes, clear dashboard cache:

```bash
php artisan tinker
```

```php
$service = app(\App\Services\DashboardService::class);
$service->clearCache();
```

Or clear all caches:

```bash
php artisan cache:clear
```

---

## Additional Resources

**Laravel Documentation:**
- [Caching](https://laravel.com/docs/12.x/cache)
- [Database: Query Builder](https://laravel.com/docs/12.x/queries)
- [Database: Migrations](https://laravel.com/docs/12.x/migrations)

**i18next Documentation:**
- [React i18next](https://react.i18next.com/)
- [i18next](https://www.i18next.com/)

**Performance:**
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Redis Best Practices](https://redis.io/docs/management/optimization/)

---

## Support

For Phase 6 specific issues:

1. Check this addendum's Troubleshooting section
2. Review Phase 6 implementation summary: `doc/plan/2025-11-27-phase-6-localization-performance-implementation-summary.md`
3. Check application logs: `storage/logs/laravel.log`
4. Contact system administrator

---

**Document Version:** 1.0
**Phase:** 6 (Localization & Performance)
**Last Updated:** November 27, 2025
**Status:** Production Ready

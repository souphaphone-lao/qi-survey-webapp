# QI Survey Web Application

A multi-institution survey data collection platform built with Laravel 12 and React 18. This application enables organizations to manage survey questionnaires, collect submissions from multiple institutions, and implement an approval workflow for data quality control.

## Features

- **Role-Based Access Control**: Three distinct roles with granular permissions
  - **Admin**: Full system access - manage users, institutions, questionnaires, and approve submissions
  - **Enumerator**: Create and edit own submissions, view questionnaires
  - **Viewer**: Read-only access to questionnaires and submissions

- **Multi-Institution Hierarchy**: Organize institutions across three levels
  - Central (national level)
  - Province (regional level)
  - District (local level)

- **Flexible Questionnaire Management**
  - Import questionnaires using SurveyJS JSON format
  - Create questionnaires visually at [surveyjs.io/create-free-survey](https://surveyjs.io/create-free-survey)
  - Version control for questionnaires
  - Activate/deactivate questionnaires

- **Submission Workflow**
  - **Draft**: Save work in progress
  - **Submit**: Send for review
  - **Approve**: Accept submission (admin only)
  - **Reject**: Return with comments for revision (admin only)

- **Data Security**
  - Laravel Sanctum authentication with secure token-based API
  - Account lockout after 5 failed login attempts (15-minute lockout)
  - Soft deletes for audit trails
  - User activity tracking (created_by, updated_by)

## Tech Stack

### Backend
- **PHP 8.2+** with Laravel 12
- **PostgreSQL** (recommended) or SQLite for development
- **Laravel Sanctum** for API authentication
- **Spatie Laravel Permission** for role and permission management
- **Pest** for testing

### Frontend
- **React 18** with TypeScript
- **TailwindCSS 4** for styling
- **SurveyJS** for dynamic form rendering
- **TanStack Query** for server state management
- **React Router** for navigation
- **Vite** for fast development builds
- **Jest** for testing

## Requirements

- PHP 8.2 or higher
- PostgreSQL 16+ (or SQLite for development)
- Node.js 20+ and npm
- Composer 2.x

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd qi-survey-webapp

# Install PHP dependencies
composer install

# Install JavaScript dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

### 3. Configure Database

Edit `.env` and set your database connection:

**For PostgreSQL (recommended for production):**
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=qi_survey
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

**For SQLite (quick development setup):**
```env
DB_CONNECTION=sqlite
# DB_DATABASE will default to database/database.sqlite
```

If using SQLite, create the database file:
```bash
touch database/database.sqlite
```

### 4. Database Setup

```bash
# Run migrations
php artisan migrate

# Seed database with roles, permissions, and default admin user
php artisan db:seed
```

This creates:
- Three roles: admin, enumerator, viewer
- Required permissions
- Central Office institution
- Default admin user

### 5. Run the Application

**Option A: Using Laravel Herd** (recommended on Windows/Mac)
- Ensure Laravel Herd is installed and running
- Access the application at: `http://qi-survey-webapp.test`
- In a separate terminal, run the frontend:
  ```bash
  npm run dev
  ```

**Option B: Using php artisan serve**
```bash
# Terminal 1 - Backend server
php artisan serve

# Terminal 2 - Frontend dev server
npm run dev
```

Access the application at: `http://localhost:8000`

### 6. Login

Use the default admin credentials:
- **Email**: admin@example.com
- **Password**: password

**Important**: Change this password immediately in production!

## Development

### Running Tests

```bash
# Backend tests (Pest)
php artisan test
# or
./vendor/bin/pest

# Frontend tests (Jest)
npm test

# Frontend tests with coverage
npm run test:coverage
```

### Type Checking

```bash
npm run typecheck
```

### Code Style

```bash
# PHP code formatting with Laravel Pint
./vendor/bin/pint

# Check without fixing
./vendor/bin/pint --test
```

### Development with Concurrently

The project includes a composer script that runs all development services simultaneously:

```bash
composer dev
```

This runs:
- Laravel development server (port 8000)
- Queue worker
- Log viewer (Laravel Pail)
- Vite dev server

## Project Structure

```
qi-survey-webapp/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/    # API controllers
│   │   ├── Requests/           # Form request validation
│   │   └── Resources/          # API resources
│   ├── Models/                 # Eloquent models
│   └── Policies/               # Authorization policies
├── database/
│   ├── migrations/             # Database migrations
│   └── seeders/                # Database seeders
├── resources/
│   ├── js/
│   │   ├── components/         # React components
│   │   ├── contexts/           # React contexts
│   │   ├── pages/              # Page components
│   │   └── app.tsx            # React entry point
│   └── views/
│       └── app.blade.php       # Main HTML template
├── routes/
│   ├── api.php                 # API routes
│   └── web.php                 # Web routes
├── tests/
│   ├── Feature/                # Feature tests
│   └── Unit/                   # Unit tests
└── doc/
    └── guides/                 # User guides
```

## API Endpoints

All API endpoints are prefixed with `/api` and require authentication (except `/api/login`).

### Authentication
- `POST /api/login` - Authenticate user
- `POST /api/logout` - Log out user
- `GET /api/user` - Get authenticated user

### Users (Admin only)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/{id}` - View user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Deactivate user

### Institutions (Admin only)
- `GET /api/institutions` - List institutions
- `GET /api/institutions/list` - Simple list for dropdowns
- `POST /api/institutions` - Create institution
- `GET /api/institutions/{id}` - View institution
- `PUT /api/institutions/{id}` - Update institution
- `DELETE /api/institutions/{id}` - Delete institution

### Questionnaires
- `GET /api/questionnaires` - List questionnaires
- `GET /api/questionnaires/list` - Simple list for dropdowns
- `POST /api/questionnaires` - Create questionnaire (Admin)
- `GET /api/questionnaires/{id}` - View questionnaire
- `PUT /api/questionnaires/{id}` - Update questionnaire (Admin)
- `DELETE /api/questionnaires/{id}` - Delete questionnaire (Admin)
- `POST /api/questionnaires/{id}/duplicate` - Duplicate questionnaire (Admin)

### Submissions
- `GET /api/submissions` - List submissions
- `GET /api/questionnaires/{id}/submissions` - List submissions by questionnaire
- `POST /api/questionnaires/{id}/submissions` - Create submission
- `GET /api/submissions/{id}` - View submission
- `PUT /api/submissions/{id}` - Update submission (draft/rejected only)
- `DELETE /api/submissions/{id}` - Delete submission (draft only)
- `POST /api/submissions/{id}/submit` - Submit for review
- `POST /api/submissions/{id}/approve` - Approve submission (Admin)
- `POST /api/submissions/{id}/reject` - Reject submission (Admin)

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Documentation

- [Administrator Guide](doc/guides/admin-guide.md) - Managing users, institutions, questionnaires, and submissions
- [Enumerator Guide](doc/guides/enumerator-guide.md) - Filling out surveys and managing submissions
- [Setup Guide](doc/guides/setup-guide.md) - Detailed setup and deployment instructions

## Security Considerations

- Always change default admin password in production
- Use strong, unique passwords for all users
- Enable HTTPS in production
- Regularly update dependencies
- Review and configure CORS settings in `config/cors.php`
- Set appropriate `SESSION_LIFETIME` in `.env`
- Configure proper `APP_URL` in `.env`
- Use environment-specific `.env` files

## Production Deployment

See [Setup Guide](doc/guides/setup-guide.md#production-deployment) for detailed production deployment instructions including:
- Environment configuration
- Database optimization
- Asset compilation
- Caching strategies
- Queue workers
- Supervisor configuration

## License

This project is proprietary software. All rights reserved.

## Support

For issues or questions, please contact your system administrator or refer to the documentation in the `doc/guides/` directory.

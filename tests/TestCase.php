<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Creates the application.
     *
     * This method is called before each test to bootstrap the Laravel application.
     * We override it to ensure test environment variables are properly loaded.
     */
    public function createApplication(): Application
    {
        // Force test environment variables BEFORE application boots
        // This ensures phpunit.xml <env> values take precedence over .env
        $_ENV['APP_ENV'] = 'testing';
        $_ENV['DB_CONNECTION'] = 'sqlite';
        $_ENV['DB_DATABASE'] = ':memory:';
        $_ENV['CACHE_STORE'] = 'array';
        $_ENV['CACHE_DRIVER'] = 'array';  // Laravel 12 uses CACHE_DRIVER
        $_ENV['SESSION_DRIVER'] = 'array';
        $_ENV['QUEUE_CONNECTION'] = 'sync';
        $_ENV['MAIL_MAILER'] = 'array';

        // Also set in $_SERVER for compatibility
        $_SERVER['APP_ENV'] = 'testing';
        $_SERVER['DB_CONNECTION'] = 'sqlite';
        $_SERVER['DB_DATABASE'] = ':memory:';
        $_SERVER['CACHE_STORE'] = 'array';
        $_SERVER['CACHE_DRIVER'] = 'array';
        $_SERVER['SESSION_DRIVER'] = 'array';
        $_SERVER['QUEUE_CONNECTION'] = 'sync';
        $_SERVER['MAIL_MAILER'] = 'array';

        // Load the application
        $app = require __DIR__.'/../bootstrap/app.php';

        $app->make(Kernel::class)->bootstrap();

        return $app;
    }

    /**
     * Setup the test environment.
     *
     * This method runs before each test and includes critical safety checks
     * to prevent tests from running against production databases.
     */
    protected function setUp(): void
    {
        parent::setUp();

        // CRITICAL SAFETY CHECK: Ensure we're in testing environment
        $this->ensureTestingEnvironment();
    }

    /**
     * Ensure tests are running in a safe testing environment.
     *
     * This prevents catastrophic data loss by verifying:
     * 1. APP_ENV is set to 'testing'
     * 2. Database is SQLite in-memory (not a production database)
     *
     * @throws \RuntimeException if environment is unsafe
     */
    protected function ensureTestingEnvironment(): void
    {
        // Check APP_ENV
        if (app()->environment() !== 'testing') {
            throw new \RuntimeException(
                'Tests can only run in testing environment. Current environment: ' . app()->environment()
            );
        }

        // Check database connection
        $connection = config('database.default');
        $database = config('database.connections.' . $connection . '.database');

        // Only allow SQLite in-memory for tests
        if ($connection !== 'sqlite' || $database !== ':memory:') {
            throw new \RuntimeException(
                "Tests must use SQLite in-memory database. Current: {$connection} ({$database})"
            );
        }
    }
}

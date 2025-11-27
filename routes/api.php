<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\InstitutionController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PingController;
use App\Http\Controllers\Api\QuestionPermissionController;
use App\Http\Controllers\Api\QuestionnaireController;
use App\Http\Controllers\Api\SubmissionController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::get('/ping', [PingController::class, 'ping'])->middleware('throttle:60,1'); // Rate limit: 60 requests per minute

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/preferences', [AuthController::class, 'updatePreferences']);

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::prefix('dashboard')->group(function () {
        Route::get('/overview', [DashboardController::class, 'overview']);
        Route::get('/trends', [DashboardController::class, 'trends']);
        Route::get('/institutions', [DashboardController::class, 'institutions']);
        Route::get('/questionnaire/{code}', [DashboardController::class, 'questionnaire']);
    });

    // Users
    Route::apiResource('users', UserController::class);

    // Institutions
    Route::get('/institutions/list', [InstitutionController::class, 'list']);
    Route::apiResource('institutions', InstitutionController::class);

    // Departments
    Route::get('/departments/list', [DepartmentController::class, 'list']);
    Route::apiResource('departments', DepartmentController::class);

    // Questionnaires
    Route::get('/questionnaires/list', [QuestionnaireController::class, 'list']);
    Route::post('/questionnaires/{questionnaire}/duplicate', [QuestionnaireController::class, 'duplicate']);
    Route::post('/questionnaires/{questionnaire}/activate', [QuestionnaireController::class, 'activate']);
    Route::post('/questionnaires/{questionnaire}/deactivate', [QuestionnaireController::class, 'deactivate']);
    Route::get('/questionnaires/{questionnaire}/versions', [QuestionnaireController::class, 'versions']);
    Route::post('/questionnaires/{questionnaire}/compare', [QuestionnaireController::class, 'compare']);
    Route::apiResource('questionnaires', QuestionnaireController::class);

    // Question Permissions
    Route::get('/questionnaires/{questionnaire}/permissions', [QuestionPermissionController::class, 'byQuestionnaire']);
    Route::post('/question-permissions/bulk', [QuestionPermissionController::class, 'bulkStore']);
    Route::apiResource('question-permissions', QuestionPermissionController::class)->except(['show', 'update']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);

    // Submissions
    Route::get('/questionnaires/{questionnaire}/submissions', [SubmissionController::class, 'byQuestionnaire']);
    Route::post('/submissions/{submission}/submit', [SubmissionController::class, 'submit']);
    Route::post('/submissions/{submission}/approve', [SubmissionController::class, 'approve']);
    Route::post('/submissions/{submission}/reject', [SubmissionController::class, 'reject']);
    Route::apiResource('submissions', SubmissionController::class);

    // Exports
    Route::prefix('exports')->group(function () {
        Route::get('/', [ExportController::class, 'index']); // Get export history
        Route::post('/questionnaires/{questionnaireCode}', [ExportController::class, 'store']); // Request export
        Route::get('/{exportJob}', [ExportController::class, 'show']); // Get export status
        Route::get('/{exportJob}/download', [ExportController::class, 'download']); // Download export
        Route::delete('/{exportJob}', [ExportController::class, 'destroy']); // Delete export
    });
});

<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\MemberController;
use App\Http\Controllers\Api\ProductionController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingController;
use Illuminate\Support\Facades\Route;

// Public route
Route::post('/login', [AuthController::class, 'login']);

// Protected routes (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    // Authentication
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Members
    Route::get('/members', [MemberController::class, 'index']);
    Route::post('/members', [MemberController::class, 'store']);
    Route::get('/members/{id}', [MemberController::class, 'show']);
    Route::post('/members/{id}', [MemberController::class, 'update']); // Using POST to support file uploads with _method=PUT or straight POST
    Route::put('/members/{id}', [MemberController::class, 'update']);
    Route::delete('/members/{id}', [MemberController::class, 'destroy']);

    // Productions
    Route::get('/productions', [ProductionController::class, 'index']);
    Route::post('/productions', [ProductionController::class, 'store']);
    Route::get('/productions/{id}', [ProductionController::class, 'show']);
    Route::put('/productions/{id}', [ProductionController::class, 'update']);
    Route::delete('/productions/{id}', [ProductionController::class, 'destroy']);

    // Sales
    Route::get('/sales', [SaleController::class, 'index']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::get('/sales/{id}', [SaleController::class, 'show']);
    Route::put('/sales/{id}', [SaleController::class, 'update']);
    Route::delete('/sales/{id}', [SaleController::class, 'destroy']);

    // Tasks
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::get('/tasks/{id}', [TaskController::class, 'show']);
    Route::put('/tasks/{id}', [TaskController::class, 'update']);
    Route::delete('/tasks/{id}', [TaskController::class, 'destroy']);

    // Users
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::get('/users/{id}', [UserController::class, 'show']);
    Route::post('/users/{id}', [UserController::class, 'update']); // support file uploads
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
    Route::post('/users/{id}/reset-password', [UserController::class, 'resetPassword']);
    Route::post('/users/{id}/deactivate', [UserController::class, 'deactivate']);

    // Reports
    Route::get('/reports', [ReportController::class, 'index']);

    // Settings
    Route::get('/settings', [SettingController::class, 'index']);
    Route::post('/settings', [SettingController::class, 'update']);
    Route::post('/settings/change-password', [SettingController::class, 'changePassword']);
    Route::post('/settings/backup', [SettingController::class, 'backupDatabase']);
    Route::post('/settings/restore', [SettingController::class, 'restoreDatabase']);
});

<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\LoanController;
use App\Http\Controllers\Api\MemberController;
use App\Http\Controllers\Api\ProductionController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\CashDisbursementController;
use App\Http\Controllers\Api\CashReceiptController;
use App\Http\Controllers\Api\JournalVoucherController;
use App\Http\Controllers\Api\GeneralLedgerController;
use App\Http\Controllers\Api\ShareCapitalController;
use App\Http\Middleware\EnsureAdmin;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::get('/settings', [SettingController::class, 'index']);

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
    Route::post('/members/{id}', [MemberController::class, 'update']);
    Route::put('/members/{id}', [MemberController::class, 'update']);
    Route::delete('/members/{id}', [MemberController::class, 'destroy']);

    // Member Share Capital & Membership Fee
    Route::get('/share-capital', [ShareCapitalController::class, 'index']);
    Route::get('/share-capital/transactions', [ShareCapitalController::class, 'transactions']);
    Route::get('/share-capital/member/{id}', [ShareCapitalController::class, 'memberLedger']);
    Route::post('/share-capital/subscribe', [ShareCapitalController::class, 'subscribe']);
    Route::post('/share-capital/contribute', [ShareCapitalController::class, 'contribute']);
    Route::post('/share-capital/membership-fee', [ShareCapitalController::class, 'recordMembershipFee']);

    // =========================================================================
    // Loan Management & Eligibility
    // =========================================================================
    // Eligibility check (read — staff-facing widget)
    Route::get('/loans/eligibility/{memberId}', [LoanController::class, 'eligibility']);

    // Loan CRUD & workflow
    Route::get('/loans', [LoanController::class, 'index']);
    Route::post('/loans', [LoanController::class, 'store']);
    Route::get('/loans/{id}', [LoanController::class, 'show']);
    Route::post('/loans/{id}/approve', [LoanController::class, 'approve']);
    Route::post('/loans/{id}/reject', [LoanController::class, 'reject']);
    Route::post('/loans/{id}/release', [LoanController::class, 'release']);
    Route::post('/loans/{id}/cancel', [LoanController::class, 'cancel']);

    // Repayment tracking
    Route::get('/loans/{id}/repayments', [LoanController::class, 'repayments']);
    Route::post('/loans/{id}/repayments', [LoanController::class, 'recordRepayment']);

    // Productions
    Route::get('/productions', [ProductionController::class, 'index']);
    Route::post('/productions', [ProductionController::class, 'store']);
    Route::get('/productions/{id}', [ProductionController::class, 'show']);
    Route::put('/productions/{id}', [ProductionController::class, 'update']);
    Route::delete('/productions/{id}', [ProductionController::class, 'destroy']);
    Route::get('/productions/{id}/payments', [ProductionController::class, 'payments']);
    Route::post('/productions/{id}/pay', [ProductionController::class, 'recordPayment']);

    // Sales
    Route::get('/sales', [SaleController::class, 'index']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::get('/sales/{id}', [SaleController::class, 'show']);
    Route::put('/sales/{id}', [SaleController::class, 'update']);
    Route::delete('/sales/{id}', [SaleController::class, 'destroy']);
    Route::get('/sales/{id}/payments', [SaleController::class, 'payments']);
    Route::post('/sales/{id}/pay', [SaleController::class, 'collectPayment']);

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
    Route::post('/users/{id}', [UserController::class, 'update']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
    Route::post('/users/{id}/reset-password', [UserController::class, 'resetPassword']);
    Route::post('/users/{id}/deactivate', [UserController::class, 'deactivate']);

    // Reports
    Route::get('/reports', [ReportController::class, 'index']);

    // Settings
    Route::post('/settings', [SettingController::class, 'update']);
    Route::post('/settings/change-password', [SettingController::class, 'changePassword']);
    Route::post('/settings/backup', [SettingController::class, 'backupDatabase']);
    Route::post('/settings/restore', [SettingController::class, 'restoreDatabase']);

    // =========================================================================
    // 📚 Books of Accounts (Administrator Only)
    // =========================================================================
    Route::middleware(EnsureAdmin::class)->prefix('books-of-accounts')->group(function () {
        // ── Removed from active UI (routes preserved for data integrity) ─────
        // Route::get('/cash-register', [CashRegisterController::class, 'index']);
        // Route::post('/cash-register', [CashRegisterController::class, 'store']);
        // Route::get('/cash-register/{id}', [CashRegisterController::class, 'show']);
        // Route::put('/cash-register/{id}', [CashRegisterController::class, 'update']);
        // Route::delete('/cash-register/{id}', [CashRegisterController::class, 'destroy']);

        // Cash Disbursement Journal
        Route::get('/cash-disbursements', [CashDisbursementController::class, 'index']);
        Route::post('/cash-disbursements', [CashDisbursementController::class, 'store']);
        Route::get('/cash-disbursements/{id}', [CashDisbursementController::class, 'show']);
        Route::put('/cash-disbursements/{id}', [CashDisbursementController::class, 'update']);
        Route::delete('/cash-disbursements/{id}', [CashDisbursementController::class, 'destroy']);

        // ── Removed from active UI (routes preserved for data integrity) ─────
        // Route::get('/sales-book', [CashSalesBookController::class, 'index']);
        // Route::post('/sales-book', [CashSalesBookController::class, 'store']);
        // Route::get('/sales-book/{id}', [CashSalesBookController::class, 'show']);
        // Route::put('/sales-book/{id}', [CashSalesBookController::class, 'update']);
        // Route::delete('/sales-book/{id}', [CashSalesBookController::class, 'destroy']);

        // Cash Receipts Journal
        Route::get('/cash-receipts', [CashReceiptController::class, 'index']);
        Route::post('/cash-receipts', [CashReceiptController::class, 'store']);
        Route::get('/cash-receipts/{id}', [CashReceiptController::class, 'show']);
        Route::put('/cash-receipts/{id}', [CashReceiptController::class, 'update']);
        Route::delete('/cash-receipts/{id}', [CashReceiptController::class, 'destroy']);

        // Journal Vouchers
        Route::get('/journal-vouchers', [JournalVoucherController::class, 'index']);
        Route::post('/journal-vouchers', [JournalVoucherController::class, 'store']);
        Route::get('/journal-vouchers/{id}', [JournalVoucherController::class, 'show']);
        Route::put('/journal-vouchers/{id}', [JournalVoucherController::class, 'update']);
        Route::delete('/journal-vouchers/{id}', [JournalVoucherController::class, 'destroy']);

        // General Ledger
        Route::get('/general-ledger', [GeneralLedgerController::class, 'index']);
        Route::post('/general-ledger', [GeneralLedgerController::class, 'store']);
        Route::post('/general-ledger/sync', [GeneralLedgerController::class, 'syncLedger']);
        Route::get('/general-ledger/{id}', [GeneralLedgerController::class, 'show']);
        Route::put('/general-ledger/{id}', [GeneralLedgerController::class, 'update']);
        Route::delete('/general-ledger/{id}', [GeneralLedgerController::class, 'destroy']);
    });
});

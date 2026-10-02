<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Member Loans table
        Schema::create('member_loans', function (Blueprint $table) {
            $table->id();

            // Linked to existing members table (reuse, do NOT duplicate)
            $table->foreignId('member_id')->constrained('members')->onDelete('cascade');

            // Eligibility snapshot at application time (stored so historical records are preserved)
            $table->decimal('paid_up_capital_at_application', 15, 2)->default(0.00)
                ->comment('Snapshot of member paid_up_capital at time of application');
            $table->decimal('loan_multiplier_at_application', 8, 4)->default(0.0000)
                ->comment('Snapshot of loan_eligibility_multiplier setting at time of application');
            $table->decimal('maximum_eligible_loan', 15, 2)->default(0.00)
                ->comment('Computed: paid_up_capital_at_application × loan_multiplier_at_application');

            // Loan application details
            $table->string('loan_reference_no')->unique()
                ->comment('System-generated reference, e.g. LN-2026-0001');
            $table->decimal('requested_amount', 15, 2)->default(0.00);
            $table->date('application_date');
            $table->string('loan_purpose')->nullable();

            // Approval
            // Status: Pending, Approved, Rejected, Released, Active, Fully Paid, Cancelled
            $table->string('status')->default('Pending');
            $table->decimal('approved_amount', 15, 2)->nullable()
                ->comment('Must not exceed maximum_eligible_loan');
            $table->date('approval_date')->nullable();
            $table->string('approved_by')->nullable();

            // Release / disbursement
            $table->date('release_date')->nullable();
            $table->string('release_payment_method')->nullable()
                ->comment('Cash, GCash, Bank Transfer, Check');
            $table->string('release_voucher_number')->nullable()
                ->comment('Links to cash_disbursement_journals.voucher_number');
            $table->foreignId('disbursement_journal_id')->nullable()
                ->constrained('cash_disbursement_journals')->nullOnDelete()
                ->comment('FK to Books of Accounts — Cash Disbursement Journal');

            // Repayment terms
            $table->integer('term_months')->nullable()
                ->comment('Loan term in months');
            $table->decimal('interest_rate', 6, 4)->nullable()
                ->comment('Annual interest rate as decimal, e.g. 0.12 = 12%');
            $table->decimal('monthly_amortization', 15, 2)->nullable();

            // Running totals (updated on each repayment)
            $table->decimal('total_amount_paid', 15, 2)->default(0.00);
            $table->decimal('outstanding_balance', 15, 2)->default(0.00);

            // Metadata
            $table->text('remarks')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete()
                ->comment('Staff/Admin who created the application');
            $table->string('recorded_by')->default('admin');
            $table->timestamps();

            // Indexes
            $table->index(['member_id', 'status']);
            $table->index('application_date');
        });

        // 2. Loan Repayments table
        Schema::create('loan_repayments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('loan_id')->constrained('member_loans')->onDelete('cascade');
            $table->foreignId('member_id')->constrained('members')->onDelete('cascade')
                ->comment('Denormalized for faster queries');

            $table->string('or_number')
                ->comment('Links to cash_receipts_journals.or_number');
            $table->foreignId('cash_receipt_id')->nullable()
                ->constrained('cash_receipts_journals')->nullOnDelete()
                ->comment('FK to Books of Accounts — Cash Receipts Journal');

            $table->date('payment_date');
            $table->decimal('amount_paid', 15, 2)->default(0.00);
            $table->decimal('principal_paid', 15, 2)->default(0.00);
            $table->decimal('interest_paid', 15, 2)->default(0.00);
            $table->decimal('balance_after_payment', 15, 2)->default(0.00);
            $table->string('payment_method')->default('Cash')
                ->comment('Cash, GCash, Bank Transfer, Check');

            $table->text('remarks')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('recorded_by')->default('admin');
            $table->timestamps();

            $table->index(['loan_id', 'payment_date']);
            $table->index('member_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_repayments');
        Schema::dropIfExists('member_loans');
    }
};

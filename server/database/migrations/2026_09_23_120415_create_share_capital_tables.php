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
        // 1. Add share capital & membership fee columns to members table
        Schema::table('members', function (Blueprint $table) {
            $table->unsignedInteger('subscribed_shares')->default(0)->after('status');
            $table->decimal('share_par_value', 12, 2)->default(0.00)->after('subscribed_shares');
            $table->decimal('subscribed_capital', 15, 2)->default(0.00)->after('share_par_value');
            $table->decimal('paid_up_capital', 15, 2)->default(0.00)->after('subscribed_capital');
            $table->decimal('cbu_balance', 15, 2)->default(0.00)->after('paid_up_capital');
            $table->string('membership_fee_status')->default('Unpaid')->after('cbu_balance'); // Paid, Unpaid, Waived
            $table->decimal('membership_fee_amount', 15, 2)->default(0.00)->after('membership_fee_status');
            $table->string('membership_fee_or')->nullable()->after('membership_fee_amount');
            $table->date('membership_fee_date')->nullable()->after('membership_fee_or');
        });

        // 2. Create share_capital_transactions table
        Schema::create('share_capital_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained('members')->onDelete('cascade');
            $table->string('transaction_type'); // 'Subscription', 'Share Capital Contribution', 'CBU Contribution', 'Withdrawal'
            $table->date('transaction_date');
            $table->string('reference_no');
            $table->decimal('amount', 15, 2)->default(0.00);
            $table->decimal('balance_after', 15, 2)->default(0.00);
            $table->string('source')->default('Cash Deposit');
            $table->string('payment_method')->default('Cash');
            $table->foreignId('cash_receipt_id')->nullable()->constrained('cash_receipts_journals')->nullOnDelete();
            $table->text('remarks')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('recorded_by')->default('admin');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('share_capital_transactions');

        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn([
                'subscribed_shares',
                'share_par_value',
                'subscribed_capital',
                'paid_up_capital',
                'cbu_balance',
                'membership_fee_status',
                'membership_fee_amount',
                'membership_fee_or',
                'membership_fee_date',
            ]);
        });
    }
};

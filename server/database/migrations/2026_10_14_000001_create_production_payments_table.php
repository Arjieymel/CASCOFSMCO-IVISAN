<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add payment tracking fields to productions table
        Schema::table('productions', function (Blueprint $table) {
            $table->string('payment_status', 20)->default('Unpaid')->after('status');
            $table->decimal('paid_amount', 15, 2)->default(0.00)->after('payment_status');
            $table->decimal('remaining_balance', 15, 2)->default(0.00)->after('paid_amount');
        });

        // 2. Add production reference to cash_disbursement_journals
        Schema::table('cash_disbursement_journals', function (Blueprint $table) {
            $table->foreignId('production_id')->nullable()->after('user_id')->constrained('productions')->nullOnDelete();
        });

        // 3. Create production_payments table for member payment history
        Schema::create('production_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_id')->constrained('productions')->cascadeOnDelete();
            $table->foreignId('cash_disbursement_id')->nullable()->constrained('cash_disbursement_journals')->nullOnDelete();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->string('voucher_number', 100);
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->string('payment_method', 50)->default('Cash');
            $table->string('approved_by', 100)->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('recorded_by', 100)->default('admin');
            $table->timestamps();
        });

        // 4. Initialize existing production records with accurate remaining balance
        DB::table('productions')->get()->each(function ($p) {
            $net = (float)($p->net_amount ?? 0);
            $status = ($net <= 0) ? 'Paid' : 'Unpaid';
            DB::table('productions')->where('id', $p->id)->update([
                'payment_status' => $status,
                'paid_amount' => 0.00,
                'remaining_balance' => $net,
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_payments');

        Schema::table('cash_disbursement_journals', function (Blueprint $table) {
            $table->dropForeign(['production_id']);
            $table->dropColumn('production_id');
        });

        Schema::table('productions', function (Blueprint $table) {
            $table->dropColumn([
                'payment_status',
                'paid_amount',
                'remaining_balance',
            ]);
        });
    }
};

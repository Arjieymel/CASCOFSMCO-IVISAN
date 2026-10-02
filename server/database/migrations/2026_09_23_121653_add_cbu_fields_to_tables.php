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
        // 1. Add CBU deduction tracking to productions table
        Schema::table('productions', function (Blueprint $table) {
            $table->decimal('unit_price', 12, 2)->nullable()->after('unit');
            $table->decimal('gross_amount', 15, 2)->default(0.00)->after('unit_price');
            $table->decimal('cbu_rate_per_kg', 8, 4)->default(0.00)->after('gross_amount');
            $table->decimal('cbu_deduction', 15, 2)->default(0.00)->after('cbu_rate_per_kg');
            $table->decimal('net_amount', 15, 2)->default(0.00)->after('cbu_deduction');
            $table->boolean('cbu_deducted')->default(false)->after('net_amount');
            $table->timestamp('cbu_deducted_at')->nullable()->after('cbu_deducted');
            $table->foreignId('cbu_transaction_id')->nullable()->constrained('share_capital_transactions')->nullOnDelete()->after('cbu_deducted_at');
        });

        // 2. Add member link and CBU tracking to sales table
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('member_id')->nullable()->after('buyer')->constrained('members')->nullOnDelete();
            $table->decimal('cbu_rate_per_kg', 8, 4)->default(0.00)->after('total_amount');
            $table->decimal('cbu_deduction', 15, 2)->default(0.00)->after('cbu_rate_per_kg');
            $table->decimal('net_amount', 15, 2)->default(0.00)->after('cbu_deduction');
            $table->boolean('cbu_deducted')->default(false)->after('net_amount');
            $table->timestamp('cbu_deducted_at')->nullable()->after('cbu_deducted');
        });

        // 3. Add link to original production/sale in share_capital_transactions
        Schema::table('share_capital_transactions', function (Blueprint $table) {
            $table->foreignId('production_id')->nullable()->after('member_id')->constrained('productions')->nullOnDelete();
            $table->foreignId('sale_id')->nullable()->after('production_id')->constrained('sales')->nullOnDelete();
            $table->decimal('kilograms', 12, 2)->nullable()->after('amount');
            $table->decimal('unit_price', 12, 2)->nullable()->after('kilograms');
            $table->decimal('gross_amount', 15, 2)->nullable()->after('unit_price');
            $table->decimal('cbu_rate_per_kg', 8, 4)->nullable()->after('gross_amount');
            $table->decimal('net_amount', 15, 2)->nullable()->after('cbu_rate_per_kg');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('share_capital_transactions', function (Blueprint $table) {
            $table->dropForeign(['production_id']);
            $table->dropForeign(['sale_id']);
            $table->dropColumn([
                'production_id',
                'sale_id',
                'kilograms',
                'unit_price',
                'gross_amount',
                'cbu_rate_per_kg',
                'net_amount',
            ]);
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
            $table->dropColumn([
                'member_id',
                'cbu_rate_per_kg',
                'cbu_deduction',
                'net_amount',
                'cbu_deducted',
                'cbu_deducted_at',
            ]);
        });

        Schema::table('productions', function (Blueprint $table) {
            $table->dropForeign(['cbu_transaction_id']);
            $table->dropColumn([
                'unit_price',
                'gross_amount',
                'cbu_rate_per_kg',
                'cbu_deduction',
                'net_amount',
                'cbu_deducted',
                'cbu_deducted_at',
                'cbu_transaction_id',
            ]);
        });
    }
};

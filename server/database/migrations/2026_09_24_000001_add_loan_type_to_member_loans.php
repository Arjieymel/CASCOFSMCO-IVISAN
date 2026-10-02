<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds loan_type column to member_loans table.
     * Valid types: Regular, Emergency, Agricultural, Special
     */
    public function up(): void
    {
        Schema::table('member_loans', function (Blueprint $table) {
            $table->string('loan_type')->default('Regular')->after('loan_purpose')
                ->comment('Type of loan: Regular, Emergency, Agricultural, Special');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('member_loans', function (Blueprint $table) {
            $table->dropColumn('loan_type');
        });
    }
};

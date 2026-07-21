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
        Schema::create('cash_disbursement_journals', function (Blueprint $table) {
            $table->id();
            $table->string('voucher_number')->unique();
            $table->date('disbursement_date');
            $table->string('payee');
            $table->text('description');
            $table->string('expense_account');
            $table->decimal('amount', 15, 2);
            $table->string('payment_method');
            $table->string('approved_by');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_disbursement_journals');
    }
};

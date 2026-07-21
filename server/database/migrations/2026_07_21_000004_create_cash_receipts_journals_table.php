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
        Schema::create('cash_receipts_journals', function (Blueprint $table) {
            $table->id();
            $table->string('or_number')->unique();
            $table->date('receipt_date');
            $table->string('received_from');
            $table->text('description');
            $table->string('source_of_income');
            $table->decimal('amount_received', 15, 2);
            $table->string('recorded_by');
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
        Schema::dropIfExists('cash_receipts_journals');
    }
};

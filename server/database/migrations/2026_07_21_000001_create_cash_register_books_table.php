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
        Schema::create('cash_register_books', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('reference_no')->unique();
            $table->text('description');
            $table->decimal('cash_in', 15, 2)->default(0.00);
            $table->decimal('cash_out', 15, 2)->default(0.00);
            $table->decimal('running_balance', 15, 2)->default(0.00);
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
        Schema::dropIfExists('cash_register_books');
    }
};

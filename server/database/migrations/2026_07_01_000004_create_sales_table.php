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
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_no')->unique();
            $table->string('buyer');
            $table->string('product'); // e.g. Copra, Coconut Oil, etc.
            $table->decimal('quantity', 10, 2);
            $table->string('unit')->default('kg');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('total_amount', 12, 2); // auto calculate or store
            $table->string('payment_method'); // Cash, GCash, Bank Transfer, Check
            $table->text('remarks')->nullable();
            $table->string('status')->default('Paid'); // Paid, Pending, Cancelled
            $table->date('sale_date');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};

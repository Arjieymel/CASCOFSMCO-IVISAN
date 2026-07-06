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
        Schema::create('productions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained('members')->onDelete('cascade');
            $table->string('product_type'); // e.g. Copra, Whole Coconut, etc.
            $table->decimal('quantity', 10, 2);
            $table->string('unit')->default('kg'); // e.g. kg
            $table->string('source'); // source farm
            $table->text('remarks')->nullable();
            $table->date('production_date');
            $table->string('status')->default('Completed'); // Pending, Approved, Completed, Cancelled
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('productions');
    }
};

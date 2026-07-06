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
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('report_type'); // Production, Sales, Member, Financial, Task, Inventory
            $table->foreignId('generated_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('generated_at')->useCurrent();
            $table->string('file_path')->nullable(); // Optional path to stored pdf/excel file
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};

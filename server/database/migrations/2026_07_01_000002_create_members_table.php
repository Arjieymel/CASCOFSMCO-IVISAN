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
        Schema::create('members', function (Blueprint $table) {
            $table->id();
            $table->string('member_code')->unique();
            $table->string('firstname');
            $table->string('lastname');
            $table->string('gender'); // Male, Female, Other
            $table->date('birthdate');
            $table->string('address');
            $table->string('contact_number');
            $table->string('email')->nullable();
            $table->date('membership_date');
            $table->string('status')->default('Active'); // Active, Inactive
            $table->string('profile_picture')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('members');
    }
};

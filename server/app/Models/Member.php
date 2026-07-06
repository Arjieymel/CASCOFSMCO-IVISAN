<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Member extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_code',
        'firstname',
        'lastname',
        'gender',
        'birthdate',
        'address',
        'contact_number',
        'email',
        'membership_date',
        'status',
        'profile_picture',
    ];

    /**
     * Get the member's full name.
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->firstname} {$this->lastname}";
    }

    /**
     * Get the member's age.
     */
    public function getAgeAttribute(): int
    {
        return now()->diffInYears(\Carbon\Carbon::parse($this->birthdate));
    }

    /**
     * Relationship with production records.
     */
    public function productions(): HasMany
    {
        return $this->hasMany(Production::class, 'member_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_type',
        'generated_by',
        'generated_at',
        'file_path',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
    ];

    /**
     * Relationship with the user who generated the report.
     */
    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}

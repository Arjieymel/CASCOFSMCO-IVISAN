<?php

namespace App\Policies;

use App\Models\User;
use App\Models\JournalVoucher;
use Illuminate\Auth\Access\HandlesAuthorization;

class JournalVoucherPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->role === 'Administrator';
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, JournalVoucher $journalVoucher): bool
    {
        return $user->role === 'Administrator';
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->role === 'Administrator';
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, JournalVoucher $journalVoucher): bool
    {
        return $user->role === 'Administrator';
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, JournalVoucher $journalVoucher): bool
    {
        return $user->role === 'Administrator';
    }
}

<?php

namespace App\Policies;

use App\Models\User;
use App\Models\GeneralLedger;
use Illuminate\Auth\Access\HandlesAuthorization;

class GeneralLedgerPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['Administrator', 'Staff']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, GeneralLedger $generalLedger): bool
    {
        return in_array($user->role, ['Administrator', 'Staff']);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['Administrator', 'Staff']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, GeneralLedger $generalLedger): bool
    {
        return in_array($user->role, ['Administrator', 'Staff']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, GeneralLedger $generalLedger): bool
    {
        return in_array($user->role, ['Administrator', 'Staff']);
    }
}

<?php

namespace App\Policies;

use App\Models\User;
use App\Models\CashReceiptsJournal;
use Illuminate\Auth\Access\HandlesAuthorization;

class CashReceiptsJournalPolicy
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
    public function view(User $user, CashReceiptsJournal $cashReceiptsJournal): bool
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
    public function update(User $user, CashReceiptsJournal $cashReceiptsJournal): bool
    {
        return in_array($user->role, ['Administrator', 'Staff']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, CashReceiptsJournal $cashReceiptsJournal): bool
    {
        return in_array($user->role, ['Administrator', 'Staff']);
    }
}

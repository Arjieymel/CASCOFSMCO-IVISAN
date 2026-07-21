<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index(Request $request)
    {
        $query = User::query();

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Sorting
        $sortColumn = $request->input('sort_by', 'created_at');
        $sortDirection = $request->input('order', 'desc');

        $allowedSorts = ['id', 'username', 'role', 'status', 'email', 'last_login', 'created_at'];
        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $users = $query->paginate($perPage);

        // Map profile picture URLs
        $users->getCollection()->transform(function($user) {
            $user->profile_picture_url = $user->profile_picture ? url('storage/' . $user->profile_picture) : null;
            return $user;
        });

        return response()->json($users);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        $request->validate([
            'username' => 'required|string|min:4|max:50|unique:users,username',
            'password' => 'required|string|min:6|confirmed',
            'role' => 'required|string|in:Administrator,Staff',
            'status' => 'required|string|in:Active,Deactivated',
            'email' => 'required|email|max:100',
            'profile_picture' => 'nullable|image|max:2048',
        ]);

        $data = $request->only(['username', 'role', 'status', 'email']);
        $data['password'] = Hash::make($request->password);

        if ($request->hasFile('profile_picture')) {
            $path = $request->file('profile_picture')->store('users/profile_pictures', 'public');
            $data['profile_picture'] = $path;
        }

        $user = User::create($data);

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Created User Account: {$user->username} (Role: {$user->role})",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user
        ], 201);
    }

    /**
     * Display the specified user.
     */
    public function show(int $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $user->profile_picture_url = $user->profile_picture ? url('storage/' . $user->profile_picture) : null;

        return response()->json($user);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, int $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $request->validate([
            'username' => ['required', 'string', 'min:4', 'max:50', Rule::unique('users', 'username')->ignore($user->id)],
            'role' => 'required|string|in:Administrator,Staff',
            'status' => 'required|string|in:Active,Deactivated',
            'email' => 'required|email|max:100',
            'profile_picture' => 'nullable|image|max:2048',
        ]);

        // Safety: Do not allow user to deactivate themselves or demote themselves from admin if they are the only admin
        if ($user->id === $request->user()->id) {
            if ($request->status !== 'Active') {
                return response()->json(['message' => 'You cannot deactivate your own account.'], 403);
            }
            if ($request->role !== $user->role && $user->role === 'Administrator') {
                // If it is the last admin
                $adminCount = User::where('role', 'Administrator')->where('status', 'Active')->count();
                if ($adminCount <= 1) {
                    return response()->json(['message' => 'You cannot change your own role. You are the only active Administrator.'], 403);
                }
            }
        }

        $data = $request->only(['username', 'role', 'status', 'email']);

        if ($request->hasFile('profile_picture')) {
            // Delete old
            if ($user->profile_picture) {
                Storage::disk('public')->delete($user->profile_picture);
            }
            $path = $request->file('profile_picture')->store('users/profile_pictures', 'public');
            $data['profile_picture'] = $path;
        }

        $user->update($data);

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Updated User Account: {$user->username} (Role: {$user->role}, Status: {$user->status})",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user
        ]);
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(Request $request, int $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Prevent self deletion
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 403);
        }

        // Prevent deleting the last administrator
        if ($user->role === 'Administrator') {
            $adminCount = User::where('role', 'Administrator')->count();
            if ($adminCount <= 1) {
                return response()->json(['message' => 'Cannot delete user. There must be at least one Administrator account.'], 403);
            }
        }

        if ($user->profile_picture) {
            Storage::disk('public')->delete($user->profile_picture);
        }

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Deleted User Account: {$user->username}",
            'ip_address' => $request->ip()
        ]);

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully'
        ]);
    }

    /**
     * Reset password for a user.
     */
    public function resetPassword(Request $request, int $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $request->validate([
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user->update([
            'password' => Hash::make($request->password)
        ]);

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Reset password for user account: {$user->username}",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Password reset successfully'
        ]);
    }

    /**
     * Deactivate a user.
     */
    public function deactivate(Request $request, int $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot deactivate your own account.'], 403);
        }

        if ($user->role === 'Administrator') {
            $adminCount = User::where('role', 'Administrator')->where('status', 'Active')->count();
            if ($adminCount <= 1) {
                return response()->json(['message' => 'Cannot deactivate user. There must be at least one active Administrator account.'], 403);
            }
        }

        $newStatus = $user->status === 'Active' ? 'Deactivated' : 'Active';
        $user->update(['status' => $newStatus]);

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => ($newStatus === 'Deactivated' ? 'Deactivated' : 'Reactivated') . " user account: {$user->username}",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'User status updated to ' . $newStatus,
            'status' => $newStatus
        ]);
    }
}

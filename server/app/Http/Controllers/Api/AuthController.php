<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class AuthController extends Controller
{
    /**
     * Handle user login request.
     */
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid username or password'
            ], 401);
        }

        if ($user->status !== 'Active') {
            return response()->json([
                'message' => 'Your account is deactivated. Please contact the administrator.'
            ], 403);
        }

        // Update last login
        $user->update([
            'last_login' => Carbon::now()
        ]);

        // Delete old tokens
        $user->tokens()->delete();

        // Create new token
        $token = $user->createToken('cascofamco_token')->plainTextToken;

        // Log the activity
        ActivityLog::create([
            'user_id' => $user->id,
            'username' => $user->username,
            'action' => 'Logged in successfully.',
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'role' => $user->role,
                'email' => $user->email,
                'profile_picture' => $user->profile_picture ? url('storage/' . $user->profile_picture) : null,
                'last_login' => $user->last_login,
            ]
        ]);
    }

    /**
     * Handle user logout request.
     */
    public function logout(Request $request)
    {
        $user = $request->user();
        
        if ($user) {
            // Log the activity
            ActivityLog::create([
                'user_id' => $user->id,
                'username' => $user->username,
                'action' => 'Logged out.',
                'ip_address' => $request->ip()
            ]);

            $user->currentAccessToken()->delete();
        }

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Get the authenticated user.
     */
    public function me(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'role' => $user->role,
                'email' => $user->email,
                'profile_picture' => $user->profile_picture ? url('storage/' . $user->profile_picture) : null,
                'last_login' => $user->last_login,
            ]
        ]);
    }
}

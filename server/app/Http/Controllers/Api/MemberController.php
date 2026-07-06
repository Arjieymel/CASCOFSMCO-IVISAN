<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class MemberController extends Controller
{
    /**
     * Display a listing of members.
     */
    public function index(Request $request)
    {
        $query = Member::query();

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('firstname', 'like', "%{$search}%")
                  ->orWhere('lastname', 'like', "%{$search}%")
                  ->orWhere('member_code', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%")
                  ->orWhere('contact_number', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('gender')) {
            $query->where('gender', $request->gender);
        }

        // Sorting
        $sortColumn = $request->input('sort_by', 'created_at');
        $sortDirection = $request->input('order', 'desc');
        
        $allowedSorts = ['id', 'member_code', 'firstname', 'lastname', 'gender', 'birthdate', 'membership_date', 'status', 'created_at'];
        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $members = $query->paginate($perPage);

        // Map file paths for profile pictures
        $members->getCollection()->transform(function($member) {
            if ($member->profile_picture) {
                $member->profile_picture_url = url('storage/' . $member->profile_picture);
            } else {
                $member->profile_picture_url = null;
            }
            // Add virtual age attribute manually for JSON representation if needed
            $member->age = $member->age;
            return $member;
        });

        return response()->json($members);
    }

    /**
     * Store a newly created member in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'firstname' => 'required|string|max:100',
            'lastname' => 'required|string|max:100',
            'gender' => 'required|string|in:Male,Female,Other',
            'birthdate' => 'required|date|before:today',
            'address' => 'required|string|max:255',
            'contact_number' => 'required|string|max:20',
            'email' => 'nullable|email|max:100',
            'membership_date' => 'required|date',
            'status' => 'required|string|in:Active,Inactive',
            'profile_picture' => 'nullable|image|max:2048', // 2MB Max
        ]);

        // Auto-generate Member Code (MEM-YYYY-XXXX)
        $year = Carbon::parse($request->membership_date)->year;
        $latestMember = Member::where('member_code', 'like', "MEM-{$year}-%")->orderBy('id', 'desc')->first();
        if ($latestMember) {
            $parts = explode('-', $latestMember->member_code);
            $seq = (int)end($parts);
            $newSeq = $seq + 1;
        } else {
            $newSeq = 1;
        }
        $memberCode = sprintf("MEM-%d-%04d", $year, $newSeq);

        $data = $request->except('profile_picture');
        $data['member_code'] = $memberCode;

        if ($request->hasFile('profile_picture')) {
            $path = $request->file('profile_picture')->store('members/profile_pictures', 'public');
            $data['profile_picture'] = $path;
        }

        $member = Member::create($data);

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Created Member: {$member->firstname} {$member->lastname} ({$memberCode})",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Member added successfully',
            'member' => $member
        ], 201);
    }

    /**
     * Display the specified member.
     */
    public function show($id)
    {
        $member = Member::with('productions')->find($id);

        if (!$member) {
            return response()->json(['message' => 'Member not found'], 404);
        }

        $member->profile_picture_url = $member->profile_picture ? url('storage/' . $member->profile_picture) : null;
        $member->age = $member->age;

        return response()->json($member);
    }

    /**
     * Update the specified member in storage.
     */
    public function update(Request $request, $id)
    {
        $member = Member::find($id);

        if (!$member) {
            return response()->json(['message' => 'Member not found'], 404);
        }

        $request->validate([
            'firstname' => 'required|string|max:100',
            'lastname' => 'required|string|max:100',
            'gender' => 'required|string|in:Male,Female,Other',
            'birthdate' => 'required|date|before:today',
            'address' => 'required|string|max:255',
            'contact_number' => 'required|string|max:20',
            'email' => 'nullable|email|max:100',
            'membership_date' => 'required|date',
            'status' => 'required|string|in:Active,Inactive',
            'profile_picture' => 'nullable|image|max:2048',
        ]);

        $data = $request->except(['profile_picture', '_method']);

        if ($request->hasFile('profile_picture')) {
            // Delete old picture
            if ($member->profile_picture) {
                Storage::disk('public')->delete($member->profile_picture);
            }
            $path = $request->file('profile_picture')->store('members/profile_pictures', 'public');
            $data['profile_picture'] = $path;
        }

        $member->update($data);

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Updated Member: {$member->firstname} {$member->lastname} ({$member->member_code})",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Member updated successfully',
            'member' => $member
        ]);
    }

    /**
     * Remove the specified member from storage.
     */
    public function destroy(Request $request, $id)
    {
        $member = Member::find($id);

        if (!$member) {
            return response()->json(['message' => 'Member not found'], 404);
        }

        // Delete profile picture
        if ($member->profile_picture) {
            Storage::disk('public')->delete($member->profile_picture);
        }

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Deleted Member: {$member->firstname} {$member->lastname} ({$member->member_code})",
            'ip_address' => $request->ip()
        ]);

        $member->delete();

        return response()->json([
            'message' => 'Member deleted successfully'
        ]);
    }
}

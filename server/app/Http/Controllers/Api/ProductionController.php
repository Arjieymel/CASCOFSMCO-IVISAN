<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Production;
use App\Models\Member;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ProductionController extends Controller
{
    /**
     * Display a listing of productions.
     */
    public function index(Request $request)
    {
        $query = Production::with('member');

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('product_type', 'like', "%{$search}%")
                  ->orWhere('source', 'like', "%{$search}%")
                  ->orWhere('remarks', 'like', "%{$search}%")
                  ->orWhereHas('member', function($mq) use ($search) {
                      $mq->where('firstname', 'like', "%{$search}%")
                         ->orWhere('lastname', 'like', "%{$search}%")
                         ->orWhere('member_code', 'like', "%{$search}%");
                  });
            });
        }

        // Filters
        if ($request->filled('member_id')) {
            $query->where('member_id', $request->member_id);
        }

        if ($request->filled('product_type')) {
            $query->where('product_type', $request->product_type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('production_date', [$request->start_date, $request->end_date]);
        }

        // Sorting
        $sortColumn = $request->input('sort_by', 'production_date');
        $sortDirection = $request->input('order', 'desc');
        
        $allowedSorts = ['id', 'production_date', 'quantity', 'product_type', 'source', 'status'];
        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection);
        } else {
            $query->orderBy('production_date', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $productions = $query->paginate($perPage);

        return response()->json($productions);
    }

    /**
     * Store a newly created production in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'member_id' => 'required|exists:members,id',
            'product_type' => 'required|string|max:100',
            'quantity' => 'required|numeric|min:0.01',
            'unit' => 'required|string|max:20',
            'source' => 'required|string|max:255',
            'remarks' => 'nullable|string',
            'production_date' => 'required|date',
            'status' => 'required|string|in:Pending,Approved,Completed,Cancelled',
        ]);

        $production = Production::create($request->all());
        $member = Member::find($production->member_id);

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Recorded Production: {$production->quantity}{$production->unit} of {$production->product_type} for member {$member->firstname} {$member->lastname}.",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Production record created successfully',
            'production' => $production->load('member')
        ], 201);
    }

    /**
     * Display the specified production.
     */
    public function show($id)
    {
        $production = Production::with('member')->find($id);

        if (!$production) {
            return response()->json(['message' => 'Production record not found'], 404);
        }

        return response()->json($production);
    }

    /**
     * Update the specified production in storage.
     */
    public function update(Request $request, $id)
    {
        $production = Production::find($id);

        if (!$production) {
            return response()->json(['message' => 'Production record not found'], 404);
        }

        $request->validate([
            'member_id' => 'required|exists:members,id',
            'product_type' => 'required|string|max:100',
            'quantity' => 'required|numeric|min:0.01',
            'unit' => 'required|string|max:20',
            'source' => 'required|string|max:255',
            'remarks' => 'nullable|string',
            'production_date' => 'required|date',
            'status' => 'required|string|in:Pending,Approved,Completed,Cancelled',
        ]);

        $production->update($request->all());
        $member = Member::find($production->member_id);

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Updated Production ID {$id}: {$production->quantity}{$production->unit} of {$production->product_type} for member {$member->firstname} {$member->lastname}.",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Production record updated successfully',
            'production' => $production->load('member')
        ]);
    }

    /**
     * Remove the specified production from storage.
     */
    public function destroy(Request $request, $id)
    {
        $production = Production::find($id);

        if (!$production) {
            return response()->json(['message' => 'Production record not found'], 404);
        }

        $member = Member::find($production->member_id);
        $memberName = $member ? "{$member->firstname} {$member->lastname}" : 'Unknown Member';

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Deleted Production ID {$id}: {$production->quantity}{$production->unit} of {$production->product_type} for member {$memberName}.",
            'ip_address' => $request->ip()
        ]);

        $production->delete();

        return response()->json([
            'message' => 'Production record deleted successfully'
        ]);
    }
}

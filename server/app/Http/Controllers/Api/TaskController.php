<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Carbon\Carbon;

class TaskController extends Controller
{
    /**
     * Display a listing of tasks.
     */
    public function index(Request $request)
    {
        // Automatically mark overdue tasks
        Task::where('status', '!=', 'Completed')
            ->where('status', '!=', 'Overdue')
            ->where('due_date', '<', Carbon::today()->format('Y-m-d'))
            ->update(['status' => 'Overdue']);

        $query = Task::with('assignee');

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('assignee', function($uq) use ($search) {
                      $uq->where('username', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        // Filters
        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Sorting
        $sortColumn = $request->input('sort_by', 'due_date');
        $sortDirection = $request->input('order', 'asc');
        
        $allowedSorts = ['id', 'title', 'priority', 'status', 'progress', 'due_date', 'created_at'];
        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection);
        } else {
            $query->orderBy('due_date', 'asc');
        }

        $perPage = $request->input('per_page', 10);
        $tasks = $query->paginate($perPage);

        return response()->json($tasks);
    }

    /**
     * Store a newly created task in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:200',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'priority' => 'required|string|in:Low,Medium,High',
            'status' => 'required|string|in:Pending,In Progress,Completed,Overdue',
            'progress' => 'required|integer|min:0|max:100',
            'due_date' => 'required|date',
        ]);

        $data = $request->all();
        // If progress is 100, force status to Completed
        if ($data['progress'] == 100) {
            $data['status'] = 'Completed';
        }

        $task = Task::create($data);
        $assignedUser = $task->assigned_to ? User::find($task->assigned_to) : null;
        $assigneeName = $assignedUser ? $assignedUser->username : 'Unassigned';

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Created Task: '{$task->title}' (Assigned: {$assigneeName}, Status: {$task->status})",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Task created successfully',
            'task' => $task->load('assignee')
        ], 201);
    }

    /**
     * Display the specified task.
     */
    public function show($id)
    {
        // Mark as overdue if applicable
        $task = Task::with('assignee')->find($id);

        if (!$task) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        if ($task->status !== 'Completed' && $task->status !== 'Overdue' && $task->due_date->isBefore(Carbon::today())) {
            $task->update(['status' => 'Overdue']);
            $task->status = 'Overdue';
        }

        return response()->json($task);
    }

    /**
     * Update the specified task in storage.
     */
    public function update(Request $request, $id)
    {
        $task = Task::find($id);

        if (!$task) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        $request->validate([
            'title' => 'required|string|max:200',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'priority' => 'required|string|in:Low,Medium,High',
            'status' => 'required|string|in:Pending,In Progress,Completed,Overdue',
            'progress' => 'required|integer|min:0|max:100',
            'due_date' => 'required|date',
        ]);

        $data = $request->all();
        // Auto mark complete
        if ($data['progress'] == 100) {
            $data['status'] = 'Completed';
        } elseif ($data['status'] === 'Completed' && $data['progress'] < 100) {
            $data['progress'] = 100;
        }

        $task->update($data);
        $assignedUser = $task->assigned_to ? User::find($task->assigned_to) : null;
        $assigneeName = $assignedUser ? $assignedUser->username : 'Unassigned';

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Updated Task '{$task->title}' (Assigned: {$assigneeName}, Status: {$task->status}, Progress: {$task->progress}%)",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Task updated successfully',
            'task' => $task->load('assignee')
        ]);
    }

    /**
     * Remove the specified task from storage.
     */
    public function destroy(Request $request, $id)
    {
        $task = Task::find($id);

        if (!$task) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Deleted Task: '{$task->title}'",
            'ip_address' => $request->ip()
        ]);

        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully'
        ]);
    }
}

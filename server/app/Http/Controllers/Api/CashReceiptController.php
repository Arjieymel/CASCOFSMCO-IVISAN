<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashReceiptsJournal;
use App\Models\ActivityLog;
use App\Http\Requests\StoreCashReceiptRequest;
use App\Http\Requests\UpdateCashReceiptRequest;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CashReceiptController extends Controller
{
    public function index(Request $request)
    {
        $query = CashReceiptsJournal::with('user');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('or_number', 'like', "%{$search}%")
                  ->orWhere('received_from', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('source_of_income', 'like', "%{$search}%")
                  ->orWhere('recorded_by', 'like', "%{$search}%")
                  ->orWhere('remarks', 'like', "%{$search}%");
            });
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('receipt_date', [$request->start_date, $request->end_date]);
        } elseif ($request->filled('start_date')) {
            $query->where('receipt_date', '>=', $request->start_date);
        } elseif ($request->filled('end_date')) {
            $query->where('receipt_date', '<=', $request->end_date);
        }

        // Calculate accurate summary totals for all matching records before pagination
        $totalsQuery = clone $query;
        $allMatching = $totalsQuery->get(['amount_received', 'source_of_income', 'remarks']);

        $totals = [
            'cashOnHand' => 0.00,
            'cashInBank' => 0.00,
            'shareCapital' => 0.00,
            'loanPayment' => 0.00,
            'grandTotal' => 0.00,
        ];

        foreach ($allMatching as $r) {
            $amt = (float)$r->amount_received;
            $totals['grandTotal'] += $amt;

            // Determine method
            $method = 'Cash';
            if ($r->remarks && preg_match('/^\[Method:\s*([^\]]+)\]/', $r->remarks, $m)) {
                $method = trim($m[1]);
            }
            if (strcasecmp($method, 'Cash') === 0) {
                $totals['cashOnHand'] += $amt;
            } else {
                $totals['cashInBank'] += $amt;
            }

            // Determine classification
            $cls = trim(strtolower($r->source_of_income ?? ''));
            if ($cls === 'share capital') {
                $totals['shareCapital'] += $amt;
            } elseif ($cls === 'loan payment') {
                $totals['loanPayment'] += $amt;
            }
        }

        $sortColumn = $request->input('sort_by', 'receipt_date');
        $sortDirection = $request->input('order', 'desc');
        $allowedSorts = ['id', 'or_number', 'receipt_date', 'received_from', 'source_of_income', 'amount_received', 'recorded_by'];

        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection)->orderBy('id', 'desc');
        } else {
            $query->orderBy('receipt_date', 'desc')->orderBy('id', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $paginated = $query->paginate($perPage);

        $response = $paginated->toArray();
        $response['totals'] = $totals;

        return response()->json($response);
    }

    public function store(StoreCashReceiptRequest $request)
    {
        $data = $request->validated();

        if (empty($data['or_number'])) {
            $year = Carbon::parse($data['receipt_date'])->year;
            $allOrs = CashReceiptsJournal::where('or_number', 'like', "OR-{$year}-%")->pluck('or_number');
            $maxSeq = 0;
            foreach ($allOrs as $existingOr) {
                $parts = explode('-', $existingOr);
                $num = (int)end($parts);
                if ($num > $maxSeq) {
                    $maxSeq = $num;
                }
            }
            $seq = $maxSeq + 1;
            do {
                $candidate = sprintf("OR-%d-%04d", $year, $seq);
                $exists = CashReceiptsJournal::where('or_number', $candidate)->exists();
                if (!$exists) {
                    break;
                }
                $seq++;
            } while ($exists);

            $data['or_number'] = $candidate;
        }

        $method = $request->input('payment_method');
        $rawRemarks = $data['remarks'] ?? '';
        $cleanRemarks = trim(preg_replace('/^\[Method:\s*[^\]]+\]\s*/', '', $rawRemarks));
        if ($method) {
            $data['remarks'] = trim("[Method: {$method}] " . $cleanRemarks);
        } elseif (!empty($cleanRemarks)) {
            $data['remarks'] = $cleanRemarks;
        }

        $user = $request->user();
        $data['user_id'] = $user ? $user->id : null;
        $data['recorded_by'] = $user ? ($user->username ?? $user->name) : 'admin';

        $record = CashReceiptsJournal::create($data);

        if ($user) {
            ActivityLog::create([
                'user_id' => $user->id,
                'username' => $user->username ?? 'admin',
                'action' => "Recorded Cash Receipt: OR {$record->or_number} from {$record->received_from} (Amount: ₱{$record->amount_received})",
                'ip_address' => $request->ip()
            ]);
        }

        return response()->json([
            'message' => 'Cash receipt recorded successfully',
            'data' => $record
        ], 201);
    }

    public function show($id)
    {
        $record = CashReceiptsJournal::with('user')->find($id);

        if (!$record) {
            return response()->json(['message' => 'Cash Receipt record not found'], 404);
        }

        return response()->json($record);
    }

    public function update(UpdateCashReceiptRequest $request, $id)
    {
        $record = CashReceiptsJournal::find($id);

        if (!$record) {
            return response()->json(['message' => 'Cash Receipt record not found'], 404);
        }

        $data = $request->validated();

        if (empty($data['or_number'])) {
            $data['or_number'] = $record->or_number;
        }

        $method = $request->input('payment_method');
        $rawRemarks = $data['remarks'] ?? $record->remarks ?? '';
        $cleanRemarks = trim(preg_replace('/^\[Method:\s*[^\]]+\]\s*/', '', $rawRemarks));
        if ($method) {
            $data['remarks'] = trim("[Method: {$method}] " . $cleanRemarks);
        } elseif (!empty($cleanRemarks)) {
            $data['remarks'] = $cleanRemarks;
        }

        $record->update($data);

        $user = $request->user();
        if ($user) {
            ActivityLog::create([
                'user_id' => $user->id,
                'username' => $user->username ?? 'admin',
                'action' => "Updated Cash Receipt OR: {$record->or_number}",
                'ip_address' => $request->ip()
            ]);
        }

        return response()->json([
            'message' => 'Cash receipt updated successfully',
            'data' => $record
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $record = CashReceiptsJournal::find($id);

        if (!$record) {
            return response()->json(['message' => 'Cash Receipt record not found'], 404);
        }

        $or = $record->or_number;
        $record->delete();

        $user = $request->user();
        if ($user) {
            ActivityLog::create([
                'user_id' => $user->id,
                'username' => $user->username ?? 'admin',
                'action' => "Deleted Cash Receipt OR: {$or}",
                'ip_address' => $request->ip()
            ]);
        }

        return response()->json([
            'message' => 'Cash receipt record deleted successfully'
        ]);
    }
}

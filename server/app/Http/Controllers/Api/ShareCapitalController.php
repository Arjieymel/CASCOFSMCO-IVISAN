<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\ShareCapitalTransaction;
use App\Models\CashReceiptsJournal;
use App\Models\ActivityLog;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ShareCapitalController extends Controller
{
    /**
     * Display a listing of member share capital summaries and overall cooperative metrics.
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
                  ->orWhere('contact_number', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Membership fee status filter
        if ($request->filled('membership_fee_status')) {
            $query->where('membership_fee_status', $request->membership_fee_status);
        }

        // Sorting
        $sortColumn = $request->input('sort_by', 'paid_up_capital');
        $sortDirection = $request->input('order', 'desc');
        $allowedSorts = ['id', 'member_code', 'firstname', 'lastname', 'subscribed_capital', 'paid_up_capital', 'cbu_balance', 'membership_fee_status'];

        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection);
        } else {
            $query->orderBy('paid_up_capital', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $members = $query->paginate($perPage);

        // Overall cooperative totals
        $allMembers = Member::all();
        $totals = [
            'total_subscribed_capital' => (float)$allMembers->sum('subscribed_capital'),
            'total_paid_up_capital' => (float)$allMembers->sum('paid_up_capital'),
            'total_cbu_contributions' => (float)$allMembers->sum('cbu_balance'),
            'total_equity' => (float)($allMembers->sum('paid_up_capital') + $allMembers->sum('cbu_balance')),
            'total_membership_fees' => (float)$allMembers->where('membership_fee_status', 'Paid')->sum('membership_fee_amount'),
            'total_members_count' => $allMembers->count(),
            'paid_membership_fee_count' => $allMembers->where('membership_fee_status', 'Paid')->count(),
            'unpaid_membership_fee_count' => $allMembers->where('membership_fee_status', '!=', 'Paid')->count(),
        ];

        // Cooperative Policy / Configurable defaults
        $policySettings = [
            'share_par_value' => Setting::getVal('share_par_value', ''),
            'default_membership_fee' => Setting::getVal('default_membership_fee', ''),
            'min_subscribed_shares' => Setting::getVal('min_subscribed_shares', ''),
            'min_initial_paid_up' => Setting::getVal('min_initial_paid_up', ''),
        ];

        return response()->json([
            'members' => $members,
            'totals' => $totals,
            'policy_settings' => $policySettings,
        ]);
    }

    /**
     * Get transaction history across all members or filtered by member.
     */
    public function transactions(Request $request)
    {
        $query = ShareCapitalTransaction::with(['member:id,member_code,firstname,lastname', 'user:id,username']);

        if ($request->filled('member_id')) {
            $query->where('member_id', $request->member_id);
        }

        if ($request->filled('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('reference_no', 'like', "%{$search}%")
                  ->orWhere('source', 'like', "%{$search}%")
                  ->orWhere('remarks', 'like', "%{$search}%")
                  ->orWhereHas('member', function($mq) use ($search) {
                      $mq->where('firstname', 'like', "%{$search}%")
                         ->orWhere('lastname', 'like', "%{$search}%")
                         ->orWhere('member_code', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('transaction_date', [$request->start_date, $request->end_date]);
        }

        $sortColumn = $request->input('sort_by', 'transaction_date');
        $sortDirection = $request->input('order', 'desc');
        $allowedSorts = ['id', 'transaction_date', 'reference_no', 'amount', 'balance_after', 'transaction_type'];

        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection)->orderBy('id', 'desc');
        } else {
            $query->orderBy('transaction_date', 'desc')->orderBy('id', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $transactions = $query->paginate($perPage);

        return response()->json($transactions);
    }

    /**
     * Get specific member's share capital details, ledger, and statement.
     */
    public function memberLedger($id)
    {
        $member = Member::with(['shareCapitalTransactions' => function($q) {
            $q->orderBy('transaction_date', 'asc')->orderBy('id', 'asc');
        }])->find($id);

        if (!$member) {
            return response()->json(['message' => 'Member not found.'], 404);
        }

        return response()->json([
            'member' => $member,
            'summary' => [
                'subscribed_shares' => (int)$member->subscribed_shares,
                'share_par_value' => (float)$member->share_par_value,
                'subscribed_capital' => (float)$member->subscribed_capital,
                'paid_up_capital' => (float)$member->paid_up_capital,
                'cbu_balance' => (float)$member->cbu_balance,
                'total_equity' => (float)$member->total_equity,
                'unpaid_subscribed_capital' => (float)$member->unpaid_subscribed_capital,
                'membership_fee_status' => $member->membership_fee_status,
                'membership_fee_amount' => (float)$member->membership_fee_amount,
                'membership_fee_or' => $member->membership_fee_or,
                'membership_fee_date' => $member->membership_fee_date,
            ],
            'transactions' => $member->shareCapitalTransactions,
        ]);
    }

    /**
     * Update / Set Member Subscribed Share Capital.
     */
    public function subscribe(Request $request)
    {
        $request->validate([
            'member_id' => 'required|exists:members,id',
            'subscribed_shares' => 'required|numeric|min:1',
            'share_par_value' => 'required|numeric|min:0.01',
            'remarks' => 'nullable|string|max:500',
        ]);

        $member = Member::findOrFail($request->member_id);
        $shares = (int)$request->subscribed_shares;
        $parValue = (float)$request->share_par_value;
        $totalSubscribed = $shares * $parValue;

        DB::transaction(function() use ($member, $shares, $parValue, $totalSubscribed, $request) {
            $member->update([
                'subscribed_shares' => $shares,
                'share_par_value' => $parValue,
                'subscribed_capital' => $totalSubscribed,
            ]);

            // Create reference subscription log entry in transaction table
            $year = Carbon::now()->year;
            $ref = sprintf("SUB-%d-%04d", $year, $member->id);

            ShareCapitalTransaction::create([
                'member_id' => $member->id,
                'transaction_type' => 'Subscription',
                'transaction_date' => Carbon::now()->toDateString(),
                'reference_no' => $ref,
                'amount' => $totalSubscribed,
                'balance_after' => (float)$member->paid_up_capital,
                'source' => 'Subscription Commitment',
                'payment_method' => 'Subscription Contract',
                'remarks' => $request->remarks ?: "Subscribed to {$shares} shares @ ₱" . number_format($parValue, 2) . "/share",
                'user_id' => $request->user()?->id,
                'recorded_by' => $request->user()?->username ?: 'admin',
            ]);

            ActivityLog::create([
                'user_id' => $request->user()?->id,
                'username' => $request->user()?->username ?: 'admin',
                'action' => "Updated Subscribed Capital for Member {$member->full_name} ({$member->member_code}): {$shares} shares @ ₱{$parValue} = ₱{$totalSubscribed}",
                'ip_address' => $request->ip(),
            ]);
        });

        return response()->json([
            'message' => 'Subscribed Share Capital updated successfully.',
            'member' => $member->fresh(),
        ]);
    }

    /**
     * Record a Share Capital payment / cash contribution.
     * Integrates directly into Cash Receipts Journal in Books of Accounts.
     */
    public function contribute(Request $request)
    {
        $request->validate([
            'member_id' => 'required|exists:members,id',
            'amount' => 'required|numeric|min:0.01',
            'transaction_date' => 'required|date',
            'payment_method' => 'required|string|in:Cash,GCash,Bank Transfer,Check',
            'reference_no' => 'nullable|string|max:100',
            'remarks' => 'nullable|string|max:500',
            'sync_cash_receipt' => 'nullable|boolean',
        ]);

        $member = Member::findOrFail($request->member_id);
        $amount = (float)$request->amount;
        $date = $request->transaction_date;
        $method = $request->payment_method;
        $remarks = $request->remarks ?: '';
        $syncReceipt = $request->boolean('sync_cash_receipt', true);

        $newTransaction = null;

        DB::transaction(function() use ($member, $amount, $date, $method, $remarks, $syncReceipt, $request, &$newTransaction) {
            // Generate OR number if empty
            $orNumber = $request->reference_no;
            if (empty($orNumber)) {
                $year = Carbon::parse($date)->year;
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
                    if (!$exists) break;
                    $seq++;
                } while ($exists);
                $orNumber = $candidate;
            }

            // Update member paid-up capital
            $currentPaidUp = (float)$member->paid_up_capital;
            $newPaidUp = $currentPaidUp + $amount;
            $member->paid_up_capital = $newPaidUp;
            $member->save();

            // 1. Accounting Integration: Create Cash Receipts Journal entry in Books of Accounts
            $cashReceipt = null;
            if ($syncReceipt) {
                $cleanRemarks = trim(preg_replace('/^\[Method:\s*[^\]]+\]\s*/', '', $remarks));
                $receiptRemarks = trim("[Method: {$method}] " . ($cleanRemarks ?: "Share Capital payment from {$member->full_name}"));

                $cashReceipt = CashReceiptsJournal::create([
                    'or_number' => $orNumber,
                    'receipt_date' => $date,
                    'received_from' => $member->full_name,
                    'description' => "Share Capital Contribution - [{$member->member_code}] {$member->full_name}",
                    'source_of_income' => 'Share Capital',
                    'amount_received' => $amount,
                    'recorded_by' => $request->user()?->username ?: 'admin',
                    'user_id' => $request->user()?->id,
                    'remarks' => $receiptRemarks,
                ]);
            }

            // 2. Create Share Capital Transaction ledger entry
            $newTransaction = ShareCapitalTransaction::create([
                'member_id' => $member->id,
                'transaction_type' => 'Share Capital Contribution',
                'transaction_date' => $date,
                'reference_no' => $orNumber,
                'amount' => $amount,
                'balance_after' => $newPaidUp,
                'source' => $method,
                'payment_method' => $method,
                'cash_receipt_id' => $cashReceipt?->id,
                'remarks' => $remarks,
                'user_id' => $request->user()?->id,
                'recorded_by' => $request->user()?->username ?: 'admin',
            ]);

            ActivityLog::create([
                'user_id' => $request->user()?->id,
                'username' => $request->user()?->username ?: 'admin',
                'action' => "Recorded Share Capital Contribution: ₱" . number_format($amount, 2) . " for {$member->full_name} ({$member->member_code}), Ref: {$orNumber}",
                'ip_address' => $request->ip(),
            ]);
        });

        return response()->json([
            'message' => 'Share Capital contribution recorded successfully and integrated into Cash Receipts Journal.',
            'transaction' => $newTransaction,
            'member' => $member->fresh(),
        ], 201);
    }

    /**
     * Record Membership Fee payment.
     * Strictly separate from Share Capital equity.
     */
    public function recordMembershipFee(Request $request)
    {
        $request->validate([
            'member_id' => 'required|exists:members,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'payment_method' => 'required|string|in:Cash,GCash,Bank Transfer,Check',
            'or_number' => 'nullable|string|max:100',
            'remarks' => 'nullable|string|max:500',
            'sync_cash_receipt' => 'nullable|boolean',
        ]);

        $member = Member::findOrFail($request->member_id);
        $amount = (float)$request->amount;
        $date = $request->payment_date;
        $method = $request->payment_method;
        $remarks = $request->remarks ?: '';
        $syncReceipt = $request->boolean('sync_cash_receipt', true);

        DB::transaction(function() use ($member, $amount, $date, $method, $remarks, $syncReceipt, $request) {
            // Generate OR number if empty
            $orNumber = $request->or_number;
            if (empty($orNumber)) {
                $year = Carbon::parse($date)->year;
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
                    if (!$exists) break;
                    $seq++;
                } while ($exists);
                $orNumber = $candidate;
            }

            // Update Member membership fee status (does NOT touch paid_up_capital or subscribed_capital)
            $member->update([
                'membership_fee_status' => 'Paid',
                'membership_fee_amount' => $amount,
                'membership_fee_or' => $orNumber,
                'membership_fee_date' => $date,
            ]);

            // Accounting Integration: Record in Cash Receipts Journal as Membership Fee income
            if ($syncReceipt) {
                $cleanRemarks = trim(preg_replace('/^\[Method:\s*[^\]]+\]\s*/', '', $remarks));
                $receiptRemarks = trim("[Method: {$method}] " . ($cleanRemarks ?: "Membership Fee from {$member->full_name}"));

                CashReceiptsJournal::create([
                    'or_number' => $orNumber,
                    'receipt_date' => $date,
                    'received_from' => $member->full_name,
                    'description' => "Membership Fee - [{$member->member_code}] {$member->full_name}",
                    'source_of_income' => 'Membership Fee',
                    'amount_received' => $amount,
                    'recorded_by' => $request->user()?->username ?: 'admin',
                    'user_id' => $request->user()?->id,
                    'remarks' => $receiptRemarks,
                ]);
            }

            ActivityLog::create([
                'user_id' => $request->user()?->id,
                'username' => $request->user()?->username ?: 'admin',
                'action' => "Recorded Membership Fee: ₱" . number_format($amount, 2) . " for {$member->full_name} ({$member->member_code}), OR: {$orNumber}",
                'ip_address' => $request->ip(),
            ]);
        });

        return response()->json([
            'message' => 'Membership Fee recorded successfully. Fee is kept separate from Share Capital.',
            'member' => $member->fresh(),
        ]);
    }
}

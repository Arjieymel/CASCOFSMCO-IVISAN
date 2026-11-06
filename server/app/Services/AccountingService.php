<?php

namespace App\Services;

use App\Models\CashDisbursementJournal;
use App\Models\CashReceiptsJournal;
use App\Models\GeneralLedger;
use App\Models\JournalVoucher;
use App\Models\Production;
use App\Models\LoanRepayment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AccountingService
{
    /**
     * Standard Chart of Accounts mapping for the cooperative.
     */
    public static array $chartOfAccounts = [
        '1010' => 'Cash on Hand',
        '1020' => 'Cash in Bank',
        '1040' => 'Loans Receivable',
        '2010' => 'Accounts Payable',
        '3010' => "Members' Share Capital - Paid-Up",
        '3020' => "Members' Share Capital - CBU",
        '4010' => 'Sales Revenue',
        '4020' => 'Membership Fee Income',
        '4030' => 'Interest Income from Loans',
        '4090' => 'Other Receipts & Income',
        '5010' => 'Copra Procurement Expenses',
        '5020' => 'Operating Expenses',
        '5030' => 'Salaries & Wages',
        '5040' => 'Equipment & Maintenance',
        '5050' => 'Utilities & Rent',
        '5060' => 'Office & Transport Expenses',
        '5090' => 'Miscellaneous Expenses',
    ];

    /**
     * Helper to resolve account code and account title.
     */
    public static function parseAccount(string $raw): array
    {
        $raw = trim($raw);
        if (preg_match('/^(\d{4})\s*-\s*(.+)$/', $raw, $matches)) {
            return [$matches[1], trim($matches[2])];
        }

        if (is_numeric($raw) && isset(self::$chartOfAccounts[$raw])) {
            return [$raw, self::$chartOfAccounts[$raw]];
        }

        foreach (self::$chartOfAccounts as $code => $title) {
            if (strcasecmp($raw, $title) === 0) {
                return [$code, $title];
            }
        }

        return [$raw, $raw];
    }

    /**
     * Generate the next unique Official Receipt (OR) number (OR-YYYY-XXXX).
     */
    public static function generateOrNumber(?string $date = null): string
    {
        $year = $date ? Carbon::parse($date)->year : Carbon::now()->year;

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

        return $candidate;
    }

    /**
     * Rebuild / Synchronize General Ledger using strict double-entry bookkeeping principles.
     * Every transaction generates both Debit and Credit entries (Total Debit = Total Credit).
     */
    public static function syncGeneralLedger(): void
    {
        try {
            DB::transaction(function () {
                // Keep manual / standalone entries that originated directly from General Ledger
                $manualEntries = GeneralLedger::where('source_module', 'General Ledger')->get()->toArray();

                // Clear ledger to rebuild clean, non-duplicated double-entry records
                GeneralLedger::query()->delete();

                $entries = [];

                // =========================================================================
                // 1. CASH DISBURSEMENT JOURNALS (Cash Outflow)
                //    Debit: Expense or Asset Account (Loans Receivable, Copra Procurement, etc.)
                //    Credit: Cash on Hand (1010) or Cash in Bank (1020)
                // =========================================================================
                $disbursements = CashDisbursementJournal::all();
                foreach ($disbursements as $cd) {
                    $amount = (float)($cd->amount ?? 0);
                    if ($amount <= 0) {
                        continue;
                    }

                    $txDate = $cd->disbursement_date ? Carbon::parse($cd->disbursement_date)->format('Y-m-d') : date('Y-m-d');
                    $refNo = $cd->voucher_number ?? '';

                    // Determine Credit Account (Cash source)
                    $method = trim($cd->payment_method ?: 'Cash');
                    if (strcasecmp($method, 'Cash') === 0) {
                        $creditAccountCode = '1010';
                        $creditAccountTitle = 'Cash on Hand';
                    } else {
                        $creditAccountCode = '1020';
                        $creditAccountTitle = 'Cash in Bank';
                    }

                    // Determine Debit Account (Expense or Receivable classification)
                    $expAcc = trim($cd->expense_account ?? 'Operating Expenses');
                    if (preg_match('/^(\d{4})\s*-\s*(.+)$/', $expAcc, $m)) {
                        $debitAccountCode = $m[1];
                        $debitAccountTitle = trim($m[2]);
                    } elseif (is_numeric($expAcc) && isset(self::$chartOfAccounts[$expAcc])) {
                        $debitAccountCode = $expAcc;
                        $debitAccountTitle = self::$chartOfAccounts[$expAcc];
                    } else {
                        $expLower = strtolower($expAcc);
                        if (str_contains($expLower, 'loan') || str_contains($expLower, 'receivable')) {
                            $debitAccountCode = '1040';
                            $debitAccountTitle = 'Loans Receivable';
                        } elseif (str_contains($expLower, 'copra') || str_contains($expLower, 'procurement')) {
                            $debitAccountCode = '5010';
                            $debitAccountTitle = 'Copra Procurement Expenses';
                        } elseif (str_contains($expLower, 'equipment') || str_contains($expLower, 'maintenance')) {
                            $debitAccountCode = '5040';
                            $debitAccountTitle = 'Equipment & Maintenance';
                        } elseif (str_contains($expLower, 'utilit') || str_contains($expLower, 'rent')) {
                            $debitAccountCode = '5050';
                            $debitAccountTitle = 'Utilities & Rent';
                        } elseif (str_contains($expLower, 'salar') || str_contains($expLower, 'wage')) {
                            $debitAccountCode = '5030';
                            $debitAccountTitle = 'Salaries & Wages';
                        } elseif (str_contains($expLower, 'office') || str_contains($expLower, 'suppl') || str_contains($expLower, 'transport')) {
                            $debitAccountCode = '5060';
                            $debitAccountTitle = 'Office & Transport Expenses';
                        } elseif (str_contains($expLower, 'operating')) {
                            $debitAccountCode = '5020';
                            $debitAccountTitle = 'Operating Expenses';
                        } else {
                            $debitAccountCode = '5090';
                            $debitAccountTitle = 'Miscellaneous Expenses (' . $expAcc . ')';
                        }
                    }

                    // Entry 1: Debit Expense / Asset
                    $entries[] = [
                        'account_code' => $debitAccountCode,
                        'account_title' => $debitAccountTitle,
                        'transaction_date' => $txDate,
                        'reference_number' => $refNo,
                        'debit' => $amount,
                        'credit' => 0.00,
                        'running_balance' => 0.00,
                        'source_module' => 'Cash Disbursement',
                        'description' => "Disbursement to {$cd->payee} - {$cd->description}",
                        'created_at' => $cd->created_at ?: now(),
                        'updated_at' => $cd->updated_at ?: now(),
                    ];

                    // Entry 2: Credit Cash / Bank
                    $entries[] = [
                        'account_code' => $creditAccountCode,
                        'account_title' => $creditAccountTitle,
                        'transaction_date' => $txDate,
                        'reference_number' => $refNo,
                        'debit' => 0.00,
                        'credit' => $amount,
                        'running_balance' => 0.00,
                        'source_module' => 'Cash Disbursement',
                        'description' => "Payment via {$method} to {$cd->payee} [Voucher: {$refNo}]",
                        'created_at' => $cd->created_at ?: now(),
                        'updated_at' => $cd->updated_at ?: now(),
                    ];
                }

                // =========================================================================
                // 2. CASH RECEIPTS JOURNALS (Cash Inflow)
                //    Debit: Cash on Hand (1010) or Cash in Bank (1020)
                //    Credit: Revenue / Equity / Asset Reduction (Share Capital, Sales, Loan Payment, etc.)
                // =========================================================================
                $receipts = CashReceiptsJournal::all();
                foreach ($receipts as $crj) {
                    $amount = (float)($crj->amount_received ?? 0);
                    if ($amount <= 0) {
                        continue;
                    }

                    $txDate = $crj->receipt_date ? Carbon::parse($crj->receipt_date)->format('Y-m-d') : date('Y-m-d');
                    $refNo = $crj->or_number ?? '';

                    // Determine Debit Account (Cash destination)
                    $method = 'Cash';
                    if (!empty($crj->payment_method)) {
                        $method = trim($crj->payment_method);
                    } elseif ($crj->remarks && preg_match('/^\[Method:\s*([^\]]+)\]/', $crj->remarks, $m)) {
                        $method = trim($m[1]);
                    }

                    if (strcasecmp($method, 'Cash') === 0) {
                        $debitAccountCode = '1010';
                        $debitAccountTitle = 'Cash on Hand';
                    } else {
                        $debitAccountCode = '1020';
                        $debitAccountTitle = 'Cash in Bank';
                    }

                    // Entry 1: Debit Cash on Hand / Bank
                    $entries[] = [
                        'account_code' => $debitAccountCode,
                        'account_title' => $debitAccountTitle,
                        'transaction_date' => $txDate,
                        'reference_number' => $refNo,
                        'debit' => $amount,
                        'credit' => 0.00,
                        'running_balance' => 0.00,
                        'source_module' => 'Cash Receipts',
                        'description' => "Collection from {$crj->received_from} - {$crj->description}",
                        'created_at' => $crj->created_at ?: now(),
                        'updated_at' => $crj->updated_at ?: now(),
                    ];

                    // Determine Credit Account(s) based on Income Classification
                    $sourceIncome = trim($crj->source_of_income ?? 'General');
                    $sourceLower = strtolower($sourceIncome);

                    if ($sourceLower === 'share capital') {
                        $entries[] = [
                            'account_code' => '3010',
                            'account_title' => "Members' Share Capital - Paid-Up",
                            'transaction_date' => $txDate,
                            'reference_number' => $refNo,
                            'debit' => 0.00,
                            'credit' => $amount,
                            'running_balance' => 0.00,
                            'source_module' => 'Cash Receipts',
                            'description' => "Share capital contribution from {$crj->received_from} [OR: {$refNo}]",
                            'created_at' => $crj->created_at ?: now(),
                            'updated_at' => $crj->updated_at ?: now(),
                        ];
                    } elseif ($sourceLower === 'membership fee') {
                        $entries[] = [
                            'account_code' => '4020',
                            'account_title' => 'Membership Fee Income',
                            'transaction_date' => $txDate,
                            'reference_number' => $refNo,
                            'debit' => 0.00,
                            'credit' => $amount,
                            'running_balance' => 0.00,
                            'source_module' => 'Cash Receipts',
                            'description' => "Membership fee from {$crj->received_from} [OR: {$refNo}]",
                            'created_at' => $crj->created_at ?: now(),
                            'updated_at' => $crj->updated_at ?: now(),
                        ];
                    } elseif (str_contains($sourceLower, 'sale')) {
                        $entries[] = [
                            'account_code' => '4010',
                            'account_title' => 'Sales Revenue',
                            'transaction_date' => $txDate,
                            'reference_number' => $refNo,
                            'debit' => 0.00,
                            'credit' => $amount,
                            'running_balance' => 0.00,
                            'source_module' => 'Cash Receipts',
                            'description' => "Sales revenue collection from {$crj->received_from} [OR: {$refNo}]",
                            'created_at' => $crj->created_at ?: now(),
                            'updated_at' => $crj->updated_at ?: now(),
                        ];
                    } elseif ($sourceLower === 'loan payment') {
                        // Check if loan repayment has principal/interest breakdown
                        $repayment = null;
                        if (!empty($crj->id)) {
                            $repayment = LoanRepayment::where('cash_receipt_id', $crj->id)->first();
                        }
                        if (!$repayment && !empty($crj->or_number)) {
                            $repayment = LoanRepayment::where('or_number', $crj->or_number)->first();
                        }

                        if ($repayment && (float)$repayment->interest_paid > 0) {
                            $inte = round((float)$repayment->interest_paid, 2);
                            if ($inte >= $amount) {
                                $inte = $amount;
                                $prin = 0.00;
                            } else {
                                $prin = round($amount - $inte, 2);
                            }

                            if ($prin > 0) {
                                $entries[] = [
                                    'account_code' => '1040',
                                    'account_title' => 'Loans Receivable',
                                    'transaction_date' => $txDate,
                                    'reference_number' => $refNo,
                                    'debit' => 0.00,
                                    'credit' => $prin,
                                    'running_balance' => 0.00,
                                    'source_module' => 'Cash Receipts',
                                    'description' => "Loan principal repayment from {$crj->received_from} [OR: {$refNo}]",
                                    'created_at' => $crj->created_at ?: now(),
                                    'updated_at' => $crj->updated_at ?: now(),
                                ];
                            }

                            if ($inte > 0) {
                                $entries[] = [
                                    'account_code' => '4030',
                                    'account_title' => 'Interest Income from Loans',
                                    'transaction_date' => $txDate,
                                    'reference_number' => $refNo,
                                    'debit' => 0.00,
                                    'credit' => $inte,
                                    'running_balance' => 0.00,
                                    'source_module' => 'Cash Receipts',
                                    'description' => "Loan interest income collection from {$crj->received_from} [OR: {$refNo}]",
                                    'created_at' => $crj->created_at ?: now(),
                                    'updated_at' => $crj->updated_at ?: now(),
                                ];
                            }
                        } else {
                            $entries[] = [
                                'account_code' => '1040',
                                'account_title' => 'Loans Receivable',
                                'transaction_date' => $txDate,
                                'reference_number' => $refNo,
                                'debit' => 0.00,
                                'credit' => $amount,
                                'running_balance' => 0.00,
                                'source_module' => 'Cash Receipts',
                                'description' => "Loan repayment collection from {$crj->received_from} [OR: {$refNo}]",
                                'created_at' => $crj->created_at ?: now(),
                                'updated_at' => $crj->updated_at ?: now(),
                            ];
                        }
                    } else {
                        $entries[] = [
                            'account_code' => '4090',
                            'account_title' => 'Other Receipts & Income (' . $sourceIncome . ')',
                            'transaction_date' => $txDate,
                            'reference_number' => $refNo,
                            'debit' => 0.00,
                            'credit' => $amount,
                            'running_balance' => 0.00,
                            'source_module' => 'Cash Receipts',
                            'description' => "Income collection from {$crj->received_from} [OR: {$refNo}]",
                            'created_at' => $crj->created_at ?: now(),
                            'updated_at' => $crj->updated_at ?: now(),
                        ];
                    }
                }

                // =========================================================================
                // 3. PRODUCTION CBU RETENTIONS (Non-Cash Equity Contributions)
                //    Debit: Copra Procurement Expenses (5010) (part of gross delivery cost)
                //    Credit: Members' Share Capital - CBU (3020)
                // =========================================================================
                $cbuProductions = Production::with('member')
                    ->where('cbu_deduction', '>', 0)
                    ->where('status', '!=', 'Cancelled')
                    ->get();

                foreach ($cbuProductions as $prod) {
                    $cbuAmount = (float)$prod->cbu_deduction;
                    if ($cbuAmount <= 0) {
                        continue;
                    }

                    $txDate = $prod->production_date ? Carbon::parse($prod->production_date)->format('Y-m-d') : date('Y-m-d');
                    $year = Carbon::parse($txDate)->year;
                    $refNo = sprintf("CBU-PRD-%d-%04d", $year, $prod->id);
                    $memberName = $prod->member ? ($prod->member->firstname . ' ' . $prod->member->lastname) : "Member #{$prod->member_id}";

                    // Entry 1: Debit Copra Procurement Expense
                    $entries[] = [
                        'account_code' => '5010',
                        'account_title' => 'Copra Procurement Expenses',
                        'transaction_date' => $txDate,
                        'reference_number' => $refNo,
                        'debit' => $cbuAmount,
                        'credit' => 0.00,
                        'running_balance' => 0.00,
                        'source_module' => 'Production CBU',
                        'description' => "CBU deduction retention from {$prod->quantity}{$prod->unit} of {$prod->product_type} for {$memberName}",
                        'created_at' => $prod->created_at ?: now(),
                        'updated_at' => $prod->updated_at ?: now(),
                    ];

                    // Entry 2: Credit Member Share Capital - CBU
                    $entries[] = [
                        'account_code' => '3020',
                        'account_title' => "Members' Share Capital - CBU",
                        'transaction_date' => $txDate,
                        'reference_number' => $refNo,
                        'debit' => 0.00,
                        'credit' => $cbuAmount,
                        'running_balance' => 0.00,
                        'source_module' => 'Production CBU',
                        'description' => "CBU capital retention credited to {$memberName} [Ref: {$refNo}]",
                        'created_at' => $prod->created_at ?: now(),
                        'updated_at' => $prod->updated_at ?: now(),
                    ];
                }

                // =========================================================================
                // 4. JOURNAL VOUCHERS (Adjusting & Direct Journal Entries)
                //    Debit: Debit Account
                //    Credit: Credit Account
                // =========================================================================
                $journalVouchers = JournalVoucher::where('status', '!=', 'Cancelled')->get();
                foreach ($journalVouchers as $jv) {
                    $amount = (float)($jv->amount ?? 0);
                    if ($amount <= 0) {
                        continue;
                    }

                    $txDate = $jv->voucher_date ? Carbon::parse($jv->voucher_date)->format('Y-m-d') : date('Y-m-d');
                    $refNo = $jv->voucher_number ?? '';

                    [$drCode, $drTitle] = self::parseAccount($jv->debit_account);
                    [$crCode, $crTitle] = self::parseAccount($jv->credit_account);

                    // Entry 1: Debit Account
                    $entries[] = [
                        'account_code' => $drCode,
                        'account_title' => $drTitle,
                        'transaction_date' => $txDate,
                        'reference_number' => $refNo,
                        'debit' => $amount,
                        'credit' => 0.00,
                        'running_balance' => 0.00,
                        'source_module' => 'Journal Voucher',
                        'description' => $jv->description ?: "Journal Voucher {$refNo} (Debit)",
                        'created_at' => $jv->created_at ?: now(),
                        'updated_at' => $jv->updated_at ?: now(),
                    ];

                    // Entry 2: Credit Account
                    $entries[] = [
                        'account_code' => $crCode,
                        'account_title' => $crTitle,
                        'transaction_date' => $txDate,
                        'reference_number' => $refNo,
                        'debit' => 0.00,
                        'credit' => $amount,
                        'running_balance' => 0.00,
                        'source_module' => 'Journal Voucher',
                        'description' => $jv->description ?: "Journal Voucher {$refNo} (Credit)",
                        'created_at' => $jv->created_at ?: now(),
                        'updated_at' => $jv->updated_at ?: now(),
                    ];
                }

                // =========================================================================
                // 5. RESTORE MANUAL GENERAL LEDGER ENTRIES
                // =========================================================================
                foreach ($manualEntries as $m) {
                    unset($m['id']);
                    $entries[] = $m;
                }

                // =========================================================================
                // 6. CALCULATE ACCURATE RUNNING BALANCES PER ACCOUNT
                //    Assets (1xxx) & Expenses (5xxx): Normal Balance = Debit (+Debit, -Credit)
                //    Liabilities (2xxx), Equity (3xxx) & Revenue (4xxx): Normal Balance = Credit (+Credit, -Debit)
                // =========================================================================
                // Group by account_code
                $byAccount = [];
                foreach ($entries as $entry) {
                    $code = $entry['account_code'];
                    $byAccount[$code][] = $entry;
                }

                $finalEntries = [];
                foreach ($byAccount as $code => $accEntries) {
                    // Sort chronologically for each account
                    usort($accEntries, function ($a, $b) {
                        $cmp = strcmp($a['transaction_date'], $b['transaction_date']);
                        if ($cmp !== 0) {
                            return $cmp;
                        }
                        return strcmp($a['reference_number'] ?? '', $b['reference_number'] ?? '');
                    });

                    // Determine normal balance based on account code
                    $isDebitNormal = str_starts_with($code, '1') || str_starts_with($code, '5');

                    $balance = 0.00;
                    foreach ($accEntries as $k => $e) {
                        $dr = (float)($e['debit'] ?? 0);
                        $cr = (float)($e['credit'] ?? 0);

                        if ($isDebitNormal) {
                            $balance += ($dr - $cr);
                        } else {
                            $balance += ($cr - $dr);
                        }

                        $accEntries[$k]['running_balance'] = round($balance, 2);
                        $finalEntries[] = $accEntries[$k];
                    }
                }

                // Sort all final entries chronologically for General Ledger viewing
                // Deterministic order: Date ASC, Ref ASC, Debit DESC (Debits before Credits for balanced display), Account Code ASC
                usort($finalEntries, function ($a, $b) {
                    $cmp = strcmp($a['transaction_date'], $b['transaction_date']);
                    if ($cmp !== 0) {
                        return $cmp;
                    }
                    $cmp = strcmp($a['reference_number'] ?? '', $b['reference_number'] ?? '');
                    if ($cmp !== 0) {
                        return $cmp;
                    }
                    if ($a['debit'] != $b['debit']) {
                        return $b['debit'] <=> $a['debit'];
                    }
                    return strcmp($a['account_code'], $b['account_code']);
                });

                // Batch insert into general_ledgers
                foreach ($finalEntries as $entry) {
                    GeneralLedger::create($entry);
                }
            });
        } catch (\Throwable $e) {
            Log::error('General Ledger synchronization failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Compute comprehensive cash and bank balances.
     */
    public static function getCashBalances(): array
    {
        $allReceipts = CashReceiptsJournal::all(['amount_received', 'remarks']);
        $allDisbursements = CashDisbursementJournal::all(['amount', 'payment_method']);

        $totalCashIn = 0.00;
        $totalCashOut = 0.00;
        $cashInOnHand = 0.00;
        $cashInInBank = 0.00;
        $cashOutOnHand = 0.00;
        $cashOutInBank = 0.00;

        foreach ($allReceipts as $r) {
            $amt = (float)$r->amount_received;
            $totalCashIn += $amt;

            $method = 'Cash';
            if (!empty($r->payment_method)) {
                $method = trim($r->payment_method);
            } elseif ($r->remarks && preg_match('/^\[Method:\s*([^\]]+)\]/', $r->remarks, $m)) {
                $method = trim($m[1]);
            }

            if (strcasecmp($method, 'Cash') === 0) {
                $cashInOnHand += $amt;
            } else {
                $cashInInBank += $amt;
            }
        }

        foreach ($allDisbursements as $d) {
            $amt = (float)$d->amount;
            $totalCashOut += $amt;

            $method = $d->payment_method ?: 'Cash';
            if (strcasecmp($method, 'Cash') === 0) {
                $cashOutOnHand += $amt;
            } else {
                $cashOutInBank += $amt;
            }
        }

        $currentCashBalance = $totalCashIn - $totalCashOut;
        $cashOnHand = $cashInOnHand - $cashOutOnHand;
        $cashInBank = $cashInInBank - $cashOutInBank;

        return [
            'total_cash_in' => round($totalCashIn, 2),
            'total_cash_out' => round($totalCashOut, 2),
            'current_cash_balance' => round($currentCashBalance, 2),
            'cash_on_hand' => round($cashOnHand, 2),
            'cash_in_bank' => round($cashInBank, 2),
            'cash_in_on_hand' => round($cashInOnHand, 2),
            'cash_in_in_bank' => round($cashInInBank, 2),
            'cash_out_on_hand' => round($cashOutOnHand, 2),
            'cash_out_in_bank' => round($cashOutInBank, 2),
        ];
    }
}

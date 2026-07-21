<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\CashRegisterBook;
use App\Models\CashDisbursementJournal;
use App\Models\CashSalesBook;
use App\Models\CashReceiptsJournal;
use App\Models\JournalVoucher;
use App\Models\GeneralLedger;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class BooksOfAccountsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faker = \Faker\Factory::create();
        $admin = User::where('role', 'Administrator')->first();
        $adminId = $admin ? $admin->id : 1;
        $adminName = $admin ? $admin->username : 'admin';

        // 1. Seed Cash Register Book (Account 1010 - Cash on Hand)
        $crBalance = 50000.00; // Initial cash on hand balance
        
        // Add Initial Balance Record
        CashRegisterBook::create([
            'date' => Carbon::now()->subMonths(6)->format('Y-m-d'),
            'reference_no' => 'CR-2026-0001',
            'description' => 'Initial Cash on Hand Balance',
            'cash_in' => 50000.00,
            'cash_out' => 0.00,
            'running_balance' => 50000.00,
            'recorded_by' => $adminName,
            'user_id' => $adminId,
            'remarks' => 'Starting balance for accounting system'
        ]);

        $crSequence = 2;
        $cdSequence = 1;
        $csSequence = 1;
        $crjSequence = 1;
        $jvSequence = 1;

        // Generate data chronologically for the past 6 months
        for ($i = 175; $i >= 0; $i -= 3) {
            $date = Carbon::now()->subDays($i);
            
            // Transaction type 1: Cash Inflow (Receipt/Sales)
            if ($faker->boolean(70)) {
                $amount = $faker->randomFloat(2, 5000, 45000);
                $crBalance += $amount;
                
                // Add Cash Register record
                $refNo = sprintf("CR-2026-%04d", $crSequence++);
                CashRegisterBook::create([
                    'date' => $date->format('Y-m-d'),
                    'reference_no' => $refNo,
                    'description' => 'Cash received from coconut product sales',
                    'cash_in' => $amount,
                    'cash_out' => 0.00,
                    'running_balance' => $crBalance,
                    'recorded_by' => $adminName,
                    'user_id' => $adminId,
                ]);

                // Add Cash Receipt Record
                $orNo = sprintf("OR-2026-%04d", $crjSequence++);
                CashReceiptsJournal::create([
                    'or_number' => $orNo,
                    'receipt_date' => $date->format('Y-m-d'),
                    'received_from' => $faker->randomElement(['Roxas Copra Traders', 'Minola Refining Corp.', 'Franklin Baker Co.']),
                    'description' => 'Receipt of payment for copra shipment',
                    'source_of_income' => 'Sales Revenue',
                    'amount_received' => $amount,
                    'recorded_by' => $adminName,
                    'user_id' => $adminId,
                ]);

                // Add Cash Sales Record
                $invNo = sprintf("INV-2026-%04d", $csSequence++);
                $qty = $faker->randomFloat(2, 100, 1000);
                $price = $faker->randomFloat(2, 45, 80);
                CashSalesBook::create([
                    'invoice_number' => $invNo,
                    'sale_date' => $date->format('Y-m-d'),
                    'customer' => $faker->randomElement(['Peter Paul Corp.', 'Franklin Baker Co.', 'Local Buyers']),
                    'product' => 'Copra',
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'total_amount' => $qty * $price,
                    'payment_method' => 'Cash',
                    'recorded_by' => $adminName,
                    'user_id' => $adminId,
                ]);
            }

            // Transaction type 2: Cash Outflow (Disbursement/Expenses)
            if ($faker->boolean(60)) {
                $amount = $faker->randomFloat(2, 2000, 25000);
                if ($crBalance - $amount > 0) {
                    $crBalance -= $amount;
                    
                    // Add Cash Register record
                    $refNo = sprintf("CR-2026-%04d", $crSequence++);
                    CashRegisterBook::create([
                        'date' => $date->format('Y-m-d'),
                        'reference_no' => $refNo,
                        'description' => 'Cash disbursement for cooperative expenditures',
                        'cash_in' => 0.00,
                        'cash_out' => $amount,
                        'running_balance' => $crBalance,
                        'recorded_by' => $adminName,
                        'user_id' => $adminId,
                    ]);

                    // Add Cash Disbursement Record
                    $voucherNo = sprintf("CDV-2026-%04d", $cdSequence++);
                    CashDisbursementJournal::create([
                        'voucher_number' => $voucherNo,
                        'disbursement_date' => $date->format('Y-m-d'),
                        'payee' => $faker->name,
                        'description' => 'Payment for warehouse operations and equipment maintenance',
                        'expense_account' => $faker->randomElement(['Operating Expenses', 'Equipment & Maintenance', 'Salaries & Wages', 'Transport & Shipping']),
                        'amount' => $amount,
                        'payment_method' => $faker->randomElement(['Cash', 'Check', 'Bank Transfer']),
                        'approved_by' => 'General Manager',
                        'recorded_by' => $adminName,
                        'user_id' => $adminId,
                    ]);
                }
            }

            // Transaction type 3: Journal Voucher (Non-cash adjustments)
            if ($faker->boolean(20)) {
                $jvAmount = $faker->randomFloat(2, 1000, 15000);
                $jvNo = sprintf("JV-2026-%04d", $jvSequence++);
                JournalVoucher::create([
                    'voucher_number' => $jvNo,
                    'voucher_date' => $date->format('Y-m-d'),
                    'description' => 'Depreciation adjustment for machinery and warehouse equipment',
                    'debit_account' => '5040 - Depreciation Expense',
                    'credit_account' => '1050 - Equipment & Assets',
                    'amount' => $jvAmount,
                    'prepared_by' => $adminName,
                    'approved_by' => 'Board of Directors',
                    'status' => 'Posted',
                    'user_id' => $adminId,
                ]);
            }
        }

        // 2. Build/Synchronize General Ledger from seeded records
        $this->syncGeneralLedger();
    }

    /**
     * Rebuild and synchronize General Ledger records chronologically.
     */
    private function syncGeneralLedger()
    {
        GeneralLedger::truncate();
        $entries = [];

        // Cash Register Books
        foreach (CashRegisterBook::all() as $cr) {
            $entries[] = [
                'account_code' => '1010',
                'account_title' => 'Cash on Hand',
                'transaction_date' => $cr->date->format('Y-m-d'),
                'reference_number' => $cr->reference_no,
                'debit' => (float)$cr->cash_in,
                'credit' => (float)$cr->cash_out,
                'running_balance' => (float)$cr->running_balance,
                'source_module' => 'Cash Register',
                'description' => $cr->description,
                'created_at' => $cr->created_at,
                'updated_at' => $cr->updated_at,
            ];
        }

        // Cash Disbursement Journals
        foreach (CashDisbursementJournal::all() as $cd) {
            $entries[] = [
                'account_code' => '5010',
                'account_title' => 'Disbursements & Expenses (' . $cd->expense_account . ')',
                'transaction_date' => $cd->disbursement_date->format('Y-m-d'),
                'reference_number' => $cd->voucher_number,
                'debit' => (float)$cd->amount,
                'credit' => 0.00,
                'running_balance' => 0.00,
                'source_module' => 'Cash Disbursement',
                'description' => "Payee: {$cd->payee} - {$cd->description}",
                'created_at' => $cd->created_at,
                'updated_at' => $cd->updated_at,
            ];
        }

        // Cash Sales Books
        foreach (CashSalesBook::all() as $sb) {
            $entries[] = [
                'account_code' => '4010',
                'account_title' => 'Cooperative Sales Revenue',
                'transaction_date' => $sb->sale_date->format('Y-m-d'),
                'reference_number' => $sb->invoice_number,
                'debit' => 0.00,
                'credit' => (float)$sb->total_amount,
                'running_balance' => 0.00,
                'source_module' => 'Sales Book',
                'description' => "Customer: {$sb->customer} - {$sb->product}",
                'created_at' => $sb->created_at,
                'updated_at' => $sb->updated_at,
            ];
        }

        // Cash Receipts Journals
        foreach (CashReceiptsJournal::all() as $crj) {
            $entries[] = [
                'account_code' => '1020',
                'account_title' => 'Income & Receipts (' . $crj->source_of_income . ')',
                'transaction_date' => $crj->receipt_date->format('Y-m-d'),
                'reference_number' => $crj->or_number,
                'debit' => (float)$crj->amount_received,
                'credit' => 0.00,
                'running_balance' => 0.00,
                'source_module' => 'Cash Receipts',
                'description' => "From: {$crj->received_from} - {$crj->description}",
                'created_at' => $crj->created_at,
                'updated_at' => $crj->updated_at,
            ];
        }

        // Journal Vouchers
        foreach (JournalVoucher::whereIn('status', ['Posted', 'Approved'])->get() as $jv) {
            $entries[] = [
                'account_code' => '3010',
                'account_title' => "Debit: {$jv->debit_account} / Credit: {$jv->credit_account}",
                'transaction_date' => $jv->voucher_date->format('Y-m-d'),
                'reference_number' => $jv->voucher_number,
                'debit' => (float)$jv->amount,
                'credit' => (float)$jv->amount,
                'running_balance' => 0.00,
                'source_module' => 'Journal Voucher',
                'description' => $jv->description,
                'created_at' => $jv->created_at,
                'updated_at' => $jv->updated_at,
            ];
        }

        // Sort entries chronologically
        usort($entries, function($a, $b) {
            return strcmp($a['transaction_date'], $b['transaction_date']);
        });

        // Calculate chronological running balance
        $runningBal = 0.00;
        foreach ($entries as &$e) {
            $runningBal += ($e['debit'] - $e['credit']);
            $e['running_balance'] = $runningBal;
        }

        // Save
        foreach ($entries as $e) {
            GeneralLedger::create($e);
        }
    }
}

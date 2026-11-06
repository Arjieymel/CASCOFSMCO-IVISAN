<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Member;
use App\Models\MemberLoan;
use App\Models\LoanRepayment;
use App\Models\Production;
use App\Models\Sale;
use App\Models\CashDisbursementJournal;
use App\Models\CashReceiptsJournal;
use App\Models\GeneralLedger;
use App\Models\JournalVoucher;
use App\Models\Setting;
use App\Services\AccountingService;

class DoubleEntryAccountingWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Member $member;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'username' => 'accountant_tester',
            'password' => bcrypt('password123'),
            'role' => 'Administrator',
            'status' => 'Active',
            'email' => 'accountant_tester@cascofamco.com',
        ]);

        $this->member = Member::create([
            'member_code' => 'MEM-2026-0001',
            'firstname' => 'Maria',
            'lastname' => 'Santos',
            'gender' => 'Female',
            'birthdate' => '1988-08-18',
            'address' => 'Poblacion, Ivisan, Capiz',
            'contact_number' => '09987654321',
            'email' => 'maria@example.com',
            'membership_date' => '2026-01-15',
            'status' => 'Active',
            'subscribed_shares' => 50,
            'share_par_value' => 100.00,
            'subscribed_capital' => 5000.00,
            'paid_up_capital' => 2000.00,
            'cbu_balance' => 500.00,
        ]);

        Setting::setVal('cbu_rate_per_kg', '0.50');
        Setting::setVal('loan_eligibility_multiplier', '2.0');
    }

    /**
     * 1. Test Cash Receipts Journal posts balanced double-entries for Cash and Bank transactions.
     */
    public function test_cash_receipts_posts_balanced_double_entry_for_cash_and_bank()
    {
        // 1A. Cash on Hand Receipt (Share Capital)
        $res1 = $this->actingAs($this->user)->postJson('/api/books-of-accounts/cash-receipts', [
            'receipt_date' => '2026-10-20',
            'received_from' => 'Maria Santos',
            'description' => 'Share Capital Contribution',
            'source_of_income' => 'Share Capital',
            'amount_received' => 3000.00,
            'payment_method' => 'Cash',
        ]);
        $res1->assertStatus(201);
        $or1 = $res1->json('data.or_number');

        // Verify Dr: 1010 (Cash on Hand) 3,000, Cr: 3010 (Share Capital) 3,000
        $drEntry1 = GeneralLedger::where('reference_number', $or1)->where('account_code', '1010')->first();
        $crEntry1 = GeneralLedger::where('reference_number', $or1)->where('account_code', '3010')->first();

        $this->assertNotNull($drEntry1);
        $this->assertNotNull($crEntry1);
        $this->assertEquals(3000.00, (float)$drEntry1->debit);
        $this->assertEquals(0.00, (float)$drEntry1->credit);
        $this->assertEquals(0.00, (float)$crEntry1->debit);
        $this->assertEquals(3000.00, (float)$crEntry1->credit);

        // 1B. Bank Receipt (Membership Fee)
        $res2 = $this->actingAs($this->user)->postJson('/api/books-of-accounts/cash-receipts', [
            'receipt_date' => '2026-10-20',
            'received_from' => 'Maria Santos',
            'description' => 'Membership Fee',
            'source_of_income' => 'Membership Fee',
            'amount_received' => 200.00,
            'payment_method' => 'Bank Transfer',
        ]);
        $res2->assertStatus(201);
        $or2 = $res2->json('data.or_number');

        // Verify Dr: 1020 (Cash in Bank) 200, Cr: 4020 (Membership Fee Income) 200
        $drEntry2 = GeneralLedger::where('reference_number', $or2)->where('account_code', '1020')->first();
        $crEntry2 = GeneralLedger::where('reference_number', $or2)->where('account_code', '4020')->first();

        $this->assertNotNull($drEntry2);
        $this->assertNotNull($crEntry2);
        $this->assertEquals(200.00, (float)$drEntry2->debit);
        $this->assertEquals(0.00, (float)$drEntry2->credit);
        $this->assertEquals(0.00, (float)$crEntry2->debit);
        $this->assertEquals(200.00, (float)$crEntry2->credit);

        // Verify overall balance
        $totalDr = GeneralLedger::sum('debit');
        $totalCr = GeneralLedger::sum('credit');
        $this->assertEquals($totalDr, $totalCr);
    }

    /**
     * 2. Test Cash Disbursements Journal posts balanced double-entries for expenses and cash outflow.
     */
    public function test_cash_disbursements_posts_balanced_double_entry()
    {
        // 2A. Cash disbursement for Operating Expenses via Cash
        $res1 = $this->actingAs($this->user)->postJson('/api/books-of-accounts/cash-disbursements', [
            'disbursement_date' => '2026-10-21',
            'payee' => 'Ivisan Electric Cooperative',
            'description' => 'Monthly electricity bill',
            'expense_account' => 'Utilities & Rent',
            'amount' => 4500.00,
            'payment_method' => 'Cash',
            'approved_by' => 'General Manager',
        ]);
        $res1->assertStatus(201);
        $v1 = $res1->json('data.voucher_number');

        $dr1 = GeneralLedger::where('reference_number', $v1)->where('account_code', '5050')->first();
        $cr1 = GeneralLedger::where('reference_number', $v1)->where('account_code', '1010')->first();

        $this->assertNotNull($dr1);
        $this->assertNotNull($cr1);
        $this->assertEquals(4500.00, (float)$dr1->debit);
        $this->assertEquals(0.00, (float)$dr1->credit);
        $this->assertEquals(0.00, (float)$cr1->debit);
        $this->assertEquals(4500.00, (float)$cr1->credit);

        // 2B. Cash disbursement via Bank Transfer
        $res2 = $this->actingAs($this->user)->postJson('/api/books-of-accounts/cash-disbursements', [
            'disbursement_date' => '2026-10-21',
            'payee' => 'Office Warehouse Inc.',
            'description' => 'Office supplies and printer toner',
            'expense_account' => 'Office & Transport Expenses',
            'amount' => 2800.00,
            'payment_method' => 'Bank Transfer',
            'approved_by' => 'General Manager',
        ]);
        $res2->assertStatus(201);
        $v2 = $res2->json('data.voucher_number');

        $dr2 = GeneralLedger::where('reference_number', $v2)->where('account_code', '5060')->first();
        $cr2 = GeneralLedger::where('reference_number', $v2)->where('account_code', '1020')->first();

        $this->assertNotNull($dr2);
        $this->assertNotNull($cr2);
        $this->assertEquals(2800.00, (float)$dr2->debit);
        $this->assertEquals(0.00, (float)$dr2->credit);
        $this->assertEquals(0.00, (float)$cr2->debit);
        $this->assertEquals(2800.00, (float)$cr2->credit);

        // Verify overall balance
        $totalDr = GeneralLedger::sum('debit');
        $totalCr = GeneralLedger::sum('credit');
        $this->assertEquals($totalDr, $totalCr);
    }

    /**
     * 3. Test Loan lifecycle double-entry: Release and Repayment with Principal + Interest breakdown.
     */
    public function test_loan_release_and_repayment_with_interest_posts_strictly_balanced_entries()
    {
        // Step 1: Submit and approve loan
        $loanRes = $this->actingAs($this->user)->postJson('/api/loans', [
            'member_id' => $this->member->id,
            'requested_amount' => 5000.00,
            'application_date' => '2026-10-20',
            'loan_purpose' => 'Farm fertilizer procurement',
            'loan_type' => 'Agricultural',
            'term_months' => 6,
            'interest_rate' => 0.05,
        ]);
        $loanRes->assertStatus(201);
        $loanId = $loanRes->json('loan.id');

        $approveRes = $this->actingAs($this->user)->postJson("/api/loans/{$loanId}/approve", [
            'approved_amount' => 5000.00,
            'approval_date' => '2026-10-20',
            'approved_by' => 'Board of Directors',
            'term_months' => 6,
            'interest_rate' => 0.05,
        ]);
        $approveRes->assertStatus(200);

        // Step 2: Release loan
        $releaseRes = $this->actingAs($this->user)->postJson("/api/loans/{$loanId}/release", [
            'release_date' => '2026-10-21',
            'release_payment_method' => 'Cash',
            'approved_by' => 'General Manager',
        ]);
        $releaseRes->assertStatus(200);
        $releaseVoucher = $releaseRes->json('disbursement.voucher_number');

        // Verify Release entry in General Ledger:
        // Dr: 1040 (Loans Receivable) 5,000, Cr: 1010 (Cash on Hand) 5,000
        $drRelease = GeneralLedger::where('reference_number', $releaseVoucher)->where('account_code', '1040')->first();
        $crRelease = GeneralLedger::where('reference_number', $releaseVoucher)->where('account_code', '1010')->first();

        $this->assertNotNull($drRelease);
        $this->assertNotNull($crRelease);
        $this->assertEquals(5000.00, (float)$drRelease->debit);
        $this->assertEquals(5000.00, (float)$crRelease->credit);

        // Step 3: Record Repayment with breakdown: Total 1,000 (Principal: 850, Interest: 150)
        $repayRes = $this->actingAs($this->user)->postJson("/api/loans/{$loanId}/repayments", [
            'payment_date' => '2026-10-25',
            'amount_paid' => 1000.00,
            'principal_paid' => 850.00,
            'interest_paid' => 150.00,
            'payment_method' => 'Cash',
            'remarks' => 'First monthly installment',
        ]);
        $repayRes->assertStatus(201);
        $orNo = $repayRes->json('repayment.or_number');

        // Verify General Ledger entries for the repayment:
        // Dr: 1010 (Cash on Hand) = 1,000
        // Cr: 1040 (Loans Receivable) = 850
        // Cr: 4030 (Interest Income from Loans) = 150
        $drCash = GeneralLedger::where('reference_number', $orNo)->where('account_code', '1010')->first();
        $crPrin = GeneralLedger::where('reference_number', $orNo)->where('account_code', '1040')->first();
        $crInt  = GeneralLedger::where('reference_number', $orNo)->where('account_code', '4030')->first();

        $this->assertNotNull($drCash);
        $this->assertNotNull($crPrin);
        $this->assertNotNull($crInt);

        $this->assertEquals(1000.00, (float)$drCash->debit);
        $this->assertEquals(850.00, (float)$crPrin->credit);
        $this->assertEquals(150.00, (float)$crInt->credit);

        // Double-entry check: Dr (1,000) === Cr (850 + 150 = 1,000)
        $txDr = GeneralLedger::where('reference_number', $orNo)->sum('debit');
        $txCr = GeneralLedger::where('reference_number', $orNo)->sum('credit');
        $this->assertEquals(1000.00, (float)$txDr);
        $this->assertEquals(1000.00, (float)$txCr);

        // Overall balance across entire General Ledger
        $totalDr = GeneralLedger::sum('debit');
        $totalCr = GeneralLedger::sum('credit');
        $this->assertEquals($totalDr, $totalCr);
    }

    /**
     * 4. Test Production CBU retention and member payment double-entry accounting.
     */
    public function test_production_cbu_and_payment_accounting_double_entry()
    {
        // 1000kg @ 40 = 40,000. CBU @ 0.50 = 500. Net Amount = 39,500.
        $prodRes = $this->actingAs($this->user)->postJson('/api/productions', [
            'member_id' => $this->member->id,
            'product_type' => 'Copra',
            'quantity' => 1000.00,
            'unit' => 'kg',
            'purchase_price' => 40.00,
            'source' => 'Brgy. Tabuc Farm',
            'production_date' => '2026-10-22',
            'status' => 'Completed',
        ]);
        $prodRes->assertStatus(201);
        $prodId = $prodRes->json('production.id');

        // Verify CBU Non-Cash retention entry:
        // Dr: 5010 (Copra Procurement Expenses) = 500.00
        // Cr: 3020 (Members' Share Capital - CBU) = 500.00
        $cbuRef = sprintf("CBU-PRD-2026-%04d", $prodId);
        $drCbu = GeneralLedger::where('reference_number', $cbuRef)->where('account_code', '5010')->first();
        $crCbu = GeneralLedger::where('reference_number', $cbuRef)->where('account_code', '3020')->first();

        $this->assertNotNull($drCbu);
        $this->assertNotNull($crCbu);
        $this->assertEquals(500.00, (float)$drCbu->debit);
        $this->assertEquals(500.00, (float)$crCbu->credit);

        // Now record actual member payment of 39,500 via Cash
        $payRes = $this->actingAs($this->user)->postJson("/api/productions/{$prodId}/pay", [
            'amount' => 39500.00,
            'payment_date' => '2026-10-22',
            'payment_method' => 'Cash',
        ]);
        $payRes->assertStatus(201);
        $voucherNo = $payRes->json('payment.voucher_number');

        // Verify payment entry:
        // Dr: 5010 (Copra Procurement Expenses) = 39,500.00
        // Cr: 1010 (Cash on Hand) = 39,500.00
        $drPay = GeneralLedger::where('reference_number', $voucherNo)->where('account_code', '5010')->first();
        $crPay = GeneralLedger::where('reference_number', $voucherNo)->where('account_code', '1010')->first();

        $this->assertNotNull($drPay);
        $this->assertNotNull($crPay);
        $this->assertEquals(39500.00, (float)$drPay->debit);
        $this->assertEquals(39500.00, (float)$crPay->credit);

        // Overall balance
        $totalDr = GeneralLedger::sum('debit');
        $totalCr = GeneralLedger::sum('credit');
        $this->assertEquals($totalDr, $totalCr);
    }

    /**
     * 5. Test Journal Voucher double-entry and validation.
     */
    public function test_journal_voucher_double_entry_and_validation()
    {
        // 5A. Attempt creating JV with identical debit and credit accounts -> should fail with 422
        $invalidRes = $this->actingAs($this->user)->postJson('/api/books-of-accounts/journal-vouchers', [
            'voucher_date' => '2026-10-23',
            'description' => 'Invalid same account transfer',
            'debit_account' => '1010 - Cash on Hand',
            'credit_account' => '1010 - Cash on Hand',
            'amount' => 1000.00,
            'approved_by' => 'Accountant',
            'status' => 'Posted',
        ]);
        $invalidRes->assertStatus(422);

        // 5B. Valid JV (Transfer from Cash on Hand to Cash in Bank)
        $validRes = $this->actingAs($this->user)->postJson('/api/books-of-accounts/journal-vouchers', [
            'voucher_date' => '2026-10-23',
            'description' => 'Bank cash deposit',
            'debit_account' => '1020 - Cash in Bank',
            'credit_account' => '1010 - Cash on Hand',
            'amount' => 15000.00,
            'approved_by' => 'General Manager',
            'status' => 'Posted',
        ]);
        $validRes->assertStatus(201);
        $jvNo = $validRes->json('data.voucher_number');

        $drJv = GeneralLedger::where('reference_number', $jvNo)->where('account_code', '1020')->first();
        $crJv = GeneralLedger::where('reference_number', $jvNo)->where('account_code', '1010')->first();

        $this->assertNotNull($drJv);
        $this->assertNotNull($crJv);
        $this->assertEquals(15000.00, (float)$drJv->debit);
        $this->assertEquals(15000.00, (float)$crJv->credit);

        // Overall balance
        $totalDr = GeneralLedger::sum('debit');
        $totalCr = GeneralLedger::sum('credit');
        $this->assertEquals($totalDr, $totalCr);
    }

    /**
     * 6. Test General Ledger API endpoint totals, calculations, and is_balanced indicator.
     */
    public function test_general_ledger_api_returns_balanced_status_and_correct_totals()
    {
        // Add Cash Receipt: 10,000
        $this->actingAs($this->user)->postJson('/api/books-of-accounts/cash-receipts', [
            'receipt_date' => '2026-10-20',
            'received_from' => 'Maria Santos',
            'description' => 'Share Capital Contribution',
            'source_of_income' => 'Share Capital',
            'amount_received' => 10000.00,
            'payment_method' => 'Cash',
        ]);

        // Add Cash Disbursement: 4,000
        $this->actingAs($this->user)->postJson('/api/books-of-accounts/cash-disbursements', [
            'disbursement_date' => '2026-10-21',
            'payee' => 'Supplies Store',
            'description' => 'Operating Expenses',
            'expense_account' => 'Operating Expenses',
            'amount' => 4000.00,
            'payment_method' => 'Cash',
            'approved_by' => 'Manager',
        ]);

        $glResponse = $this->actingAs($this->user)->getJson('/api/books-of-accounts/general-ledger');
        $glResponse->assertStatus(200);

        $totals = $glResponse->json('totals');
        $this->assertNotNull($totals);
        $this->assertEquals(14000.00, (float)$totals['total_debit']);
        $this->assertEquals(14000.00, (float)$totals['total_credit']);
        $this->assertTrue($totals['is_balanced']);
    }

    /**
     * 7. Test manual General Ledger entry validation (cannot have 0 for both or > 0 for both).
     */
    public function test_manual_general_ledger_validation()
    {
        // Both zero -> 422
        $resZero = $this->actingAs($this->user)->postJson('/api/books-of-accounts/general-ledger', [
            'account_code' => '1010',
            'account_title' => 'Cash on Hand',
            'transaction_date' => '2026-10-20',
            'reference_number' => 'MAN-001',
            'debit' => 0.00,
            'credit' => 0.00,
        ]);
        $resZero->assertStatus(422);

        // Both > 0 -> 422
        $resBoth = $this->actingAs($this->user)->postJson('/api/books-of-accounts/general-ledger', [
            'account_code' => '1010',
            'account_title' => 'Cash on Hand',
            'transaction_date' => '2026-10-20',
            'reference_number' => 'MAN-002',
            'debit' => 500.00,
            'credit' => 500.00,
        ]);
        $resBoth->assertStatus(422);
    }
}

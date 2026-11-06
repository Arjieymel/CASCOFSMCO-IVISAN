<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\CashReceiptsJournal;
use App\Models\CashDisbursementJournal;
use App\Models\GeneralLedger;
use App\Services\AccountingService;

class SaleCashBalanceIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'username' => 'admin_accountant',
            'password' => bcrypt('secret123'),
            'role' => 'Administrator',
            'status' => 'Active',
            'email' => 'accountant@cascofamco.com',
        ]);
    }

    public function test_paid_cash_sale_automatically_creates_cash_receipt_and_increases_cash_on_hand_and_syncs_gl()
    {
        $initialBalances = AccountingService::getCashBalances();

        $payload = [
            'buyer' => 'Franklin Baker Co.',
            'product' => 'Copra',
            'quantity' => 500.00,
            'unit' => 'kg',
            'unit_price' => 40.00,
            'payment_method' => 'Cash',
            'status' => 'Paid',
            'sale_date' => '2026-10-14',
            'remarks' => 'Full cash payment upon wholesale pickup',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/sales', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('sale.total_amount', '20000.00');
        $response->assertJsonPath('sale.paid_amount', '20000.00');
        $response->assertJsonPath('sale.remaining_balance', '0.00');
        $response->assertJsonPath('sale.status', 'Paid');

        $saleId = $response->json('sale.id');
        $sale = Sale::find($saleId);

        // Verify Cash Receipts Journal entry was created
        $receipt = CashReceiptsJournal::where('sale_id', $saleId)->first();
        $this->assertNotNull($receipt);
        $this->assertEquals(20000.00, (float)$receipt->amount_received);
        $this->assertEquals('Sales', $receipt->source_of_income);
        $this->assertEquals('Cash', $receipt->payment_method);
        $this->assertEquals($receipt->id, $sale->cash_receipt_id);

        // Verify Cash Balance updated
        $newBalances = AccountingService::getCashBalances();
        $this->assertEquals($initialBalances['current_cash_balance'] + 20000.00, $newBalances['current_cash_balance']);
        $this->assertEquals($initialBalances['cash_on_hand'] + 20000.00, $newBalances['cash_on_hand']);
        $this->assertEquals($initialBalances['cash_in_bank'], $newBalances['cash_in_bank']);

        // Verify General Ledger is synchronized (both Debit and Credit)
        $glDebit = GeneralLedger::where('reference_number', $receipt->or_number)
            ->where('account_code', '1010')
            ->first();
        $this->assertNotNull($glDebit);
        $this->assertEquals('Cash Receipts', $glDebit->source_module);
        $this->assertEquals(20000.00, (float)$glDebit->debit);
        $this->assertEquals(0.00, (float)$glDebit->credit);

        $glCredit = GeneralLedger::where('reference_number', $receipt->or_number)
            ->where('account_code', '4010')
            ->first();
        $this->assertNotNull($glCredit);
        $this->assertEquals('Cash Receipts', $glCredit->source_module);
        $this->assertEquals(0.00, (float)$glCredit->debit);
        $this->assertEquals(20000.00, (float)$glCredit->credit);
    }

    public function test_paid_bank_sale_automatically_increases_cash_in_bank()
    {
        $initialBalances = AccountingService::getCashBalances();

        $payload = [
            'buyer' => 'Universal Robina Corp.',
            'product' => 'Coconut Oil',
            'quantity' => 1000.00,
            'unit' => 'kg',
            'unit_price' => 50.00,
            'payment_method' => 'Bank Transfer',
            'status' => 'Paid',
            'sale_date' => '2026-10-14',
            'remarks' => 'Direct wire transfer',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/sales', $payload);

        $response->assertStatus(201);
        $saleId = $response->json('sale.id');

        $receipt = CashReceiptsJournal::where('sale_id', $saleId)->first();
        $this->assertNotNull($receipt);
        $this->assertEquals('Bank Transfer', $receipt->payment_method);
        $this->assertEquals(50000.00, (float)$receipt->amount_received);

        // Verify Bank balance increased while Cash on Hand remained unchanged
        $newBalances = AccountingService::getCashBalances();
        $this->assertEquals($initialBalances['cash_in_bank'] + 50000.00, $newBalances['cash_in_bank']);
        $this->assertEquals($initialBalances['cash_on_hand'], $newBalances['cash_on_hand']);
        $this->assertEquals($initialBalances['current_cash_balance'] + 50000.00, $newBalances['current_cash_balance']);
    }

    public function test_credit_or_pending_sale_does_not_increase_cash_until_payment_collected()
    {
        $initialBalances = AccountingService::getCashBalances();

        $payload = [
            'buyer' => 'Metro Agriventures',
            'product' => 'Charcoal',
            'quantity' => 2000.00,
            'unit' => 'kg',
            'unit_price' => 15.00,
            'payment_method' => 'Cash',
            'status' => 'Pending', // Credit sale
            'sale_date' => '2026-10-14',
            'remarks' => '30-day payment term',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/sales', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('sale.total_amount', '30000.00');
        $response->assertJsonPath('sale.paid_amount', '0.00');
        $response->assertJsonPath('sale.remaining_balance', '30000.00');
        $response->assertJsonPath('sale.status', 'Pending');

        $saleId = $response->json('sale.id');

        // Verify NO Cash Receipts Journal was created
        $receiptCount = CashReceiptsJournal::where('sale_id', $saleId)->count();
        $this->assertEquals(0, $receiptCount);

        // Verify cash balance did NOT increase
        $midBalances = AccountingService::getCashBalances();
        $this->assertEquals($initialBalances['current_cash_balance'], $midBalances['current_cash_balance']);
        $this->assertEquals($initialBalances['cash_on_hand'], $midBalances['cash_on_hand']);

        // Now collect payment on the credit sale
        $payPayload = [
            'payment_amount' => 30000.00,
            'payment_date' => '2026-10-15',
            'payment_method' => 'Cash',
            'remarks' => 'Collected full payment for Metro Agriventures',
        ];

        $payResponse = $this->actingAs($this->user)->postJson("/api/sales/{$saleId}/pay", $payPayload);
        $payResponse->assertStatus(200);
        $payResponse->assertJsonPath('sale.status', 'Paid');
        $payResponse->assertJsonPath('sale.paid_amount', '30000.00');
        $payResponse->assertJsonPath('sale.remaining_balance', '0.00');

        // Now verify Cash Receipts Journal and Cash Balances are updated
        $receipt = CashReceiptsJournal::where('sale_id', $saleId)->first();
        $this->assertNotNull($receipt);
        $this->assertEquals(30000.00, (float)$receipt->amount_received);

        $finalBalances = AccountingService::getCashBalances();
        $this->assertEquals($initialBalances['current_cash_balance'] + 30000.00, $finalBalances['current_cash_balance']);
        $this->assertEquals($initialBalances['cash_on_hand'] + 30000.00, $finalBalances['cash_on_hand']);
    }

    public function test_partial_payments_only_add_amount_received()
    {
        $initialBalances = AccountingService::getCashBalances();

        // 1. Create sale of 40,000 with partial downpayment of 15,000
        $payload = [
            'buyer' => 'Capiz Copra Traders',
            'product' => 'Copra',
            'quantity' => 1000.00,
            'unit' => 'kg',
            'unit_price' => 40.00,
            'payment_method' => 'Cash',
            'status' => 'Pending',
            'amount_received' => 15000.00,
            'sale_date' => '2026-10-14',
            'remarks' => 'Initial 15,000 cash downpayment',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/sales', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('sale.total_amount', '40000.00');
        $response->assertJsonPath('sale.paid_amount', '15000.00');
        $response->assertJsonPath('sale.remaining_balance', '25000.00');
        $response->assertJsonPath('sale.status', 'Partially Paid');

        $saleId = $response->json('sale.id');

        // Verify only 15,000 was added to Cash Receipts
        $firstReceipt = CashReceiptsJournal::where('sale_id', $saleId)->first();
        $this->assertNotNull($firstReceipt);
        $this->assertEquals(15000.00, (float)$firstReceipt->amount_received);

        $midBalances = AccountingService::getCashBalances();
        $this->assertEquals($initialBalances['cash_on_hand'] + 15000.00, $midBalances['cash_on_hand']);

        // 2. Collect remaining 25,000 via GCash
        $payPayload = [
            'payment_amount' => 25000.00,
            'payment_date' => '2026-10-16',
            'payment_method' => 'GCash',
            'remarks' => 'Final payment settled via GCash',
        ];

        $payResponse = $this->actingAs($this->user)->postJson("/api/sales/{$saleId}/pay", $payPayload);
        $payResponse->assertStatus(200);
        $payResponse->assertJsonPath('sale.status', 'Paid');
        $payResponse->assertJsonPath('sale.paid_amount', '40000.00');
        $payResponse->assertJsonPath('sale.remaining_balance', '0.00');

        // Verify two distinct Cash Receipts exist for the two partial payments
        $allReceipts = CashReceiptsJournal::where('sale_id', $saleId)->get();
        $this->assertCount(2, $allReceipts);

        $finalBalances = AccountingService::getCashBalances();
        $this->assertEquals($initialBalances['cash_on_hand'] + 15000.00, $finalBalances['cash_on_hand']);
        $this->assertEquals($initialBalances['cash_in_bank'] + 25000.00, $finalBalances['cash_in_bank']);
        $this->assertEquals($initialBalances['current_cash_balance'] + 40000.00, $finalBalances['current_cash_balance']);
    }

    public function test_cash_disbursements_decrease_the_appropriate_balance()
    {
        // 1. Record a cash sale of 50,000
        $this->actingAs($this->user)->postJson('/api/sales', [
            'buyer' => 'Buyer A',
            'product' => 'Copra',
            'quantity' => 1000.00,
            'unit' => 'kg',
            'unit_price' => 50.00,
            'payment_method' => 'Cash',
            'status' => 'Paid',
            'sale_date' => '2026-10-14',
        ]);

        $beforeDisbursement = AccountingService::getCashBalances();
        $this->assertEquals(50000.00, $beforeDisbursement['cash_on_hand']);
        $this->assertEquals(50000.00, $beforeDisbursement['current_cash_balance']);

        // 2. Record a cash disbursement / expense of 12,000
        $cdResponse = $this->actingAs($this->user)->postJson('/api/books-of-accounts/cash-disbursements', [
            'disbursement_date' => '2026-10-14',
            'payee' => 'Petron Gasoline Station',
            'description' => 'Diesel fuel for truck',
            'expense_account' => 'Transportation Expenses',
            'amount' => 12000.00,
            'payment_method' => 'Cash',
            'approved_by' => 'Manager',
        ]);

        $cdResponse->assertStatus(201);

        $afterDisbursement = AccountingService::getCashBalances();
        $this->assertEquals(38000.00, $afterDisbursement['cash_on_hand']);
        $this->assertEquals(38000.00, $afterDisbursement['current_cash_balance']);
        $this->assertEquals(12000.00, $afterDisbursement['total_cash_out']);
    }

    public function test_deleting_or_cancelling_sale_reverses_cash_receipts_and_gl()
    {
        // 1. Create paid sale of 10,000
        $response = $this->actingAs($this->user)->postJson('/api/sales', [
            'buyer' => 'Temporary Buyer',
            'product' => 'Charcoal',
            'quantity' => 200.00,
            'unit' => 'kg',
            'unit_price' => 50.00,
            'payment_method' => 'Cash',
            'status' => 'Paid',
            'sale_date' => '2026-10-14',
        ]);

        $saleId = $response->json('sale.id');
        $this->assertEquals(10000.00, AccountingService::getCashBalances()['current_cash_balance']);

        // 2. Delete the sale
        $delResponse = $this->actingAs($this->user)->deleteJson("/api/sales/{$saleId}");
        $delResponse->assertStatus(200);

        // Verify Cash Receipts Journal entry was deleted
        $this->assertEquals(0, CashReceiptsJournal::where('sale_id', $saleId)->count());

        // Verify Cash Balance is restored to 0
        $balances = AccountingService::getCashBalances();
        $this->assertEquals(0.00, $balances['current_cash_balance']);
        $this->assertEquals(0.00, $balances['cash_on_hand']);

        // Verify General Ledger does not retain the deleted sale
        $glCount = GeneralLedger::where('description', 'like', "%Temporary Buyer%")->count();
        $this->assertEquals(0, $glCount);
    }

    public function test_prevents_duplicate_payments_and_overpayment()
    {
        // 1. Create a sale of 10,000
        $response = $this->actingAs($this->user)->postJson('/api/sales', [
            'buyer' => 'Strict Buyer',
            'product' => 'Copra',
            'quantity' => 200.00,
            'unit' => 'kg',
            'unit_price' => 50.00,
            'payment_method' => 'Cash',
            'status' => 'Paid',
            'sale_date' => '2026-10-14',
        ]);

        $saleId = $response->json('sale.id');

        // 2. Try to pay again on an already fully paid sale
        $payResponse = $this->actingAs($this->user)->postJson("/api/sales/{$saleId}/pay", [
            'payment_amount' => 5000.00,
            'payment_date' => '2026-10-14',
            'payment_method' => 'Cash',
        ]);

        $payResponse->assertStatus(422);
    }
}

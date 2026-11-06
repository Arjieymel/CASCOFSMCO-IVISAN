<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Member;
use App\Models\Production;
use App\Models\Setting;
use App\Models\ShareCapitalTransaction;
use App\Models\CashDisbursementJournal;
use App\Models\CashReceiptsJournal;

class ProductionPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $member;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'username' => 'admin_test',
            'password' => bcrypt('password123'),
            'role' => 'Administrator',
            'status' => 'Active',
            'email' => 'admin@test.com',
        ]);

        $this->member = Member::create([
            'member_code' => 'MEM-2026-0001',
            'firstname' => 'Juan',
            'lastname' => 'Dela Cruz',
            'gender' => 'Male',
            'birthdate' => '1985-05-15',
            'address' => 'Brgy. Tabuc, Pontevedra',
            'contact_number' => '09123456789',
            'email' => 'juan@example.com',
            'membership_date' => '2026-01-10',
            'status' => 'Active',
            'cbu_balance' => 1000.00,
            'paid_up_capital' => 5000.00,
        ]);

        // Configure cooperative rate policy (e.g. 0.50 / kg)
        Setting::setVal('cbu_rate_per_kg', '0.50');
    }

    public function test_production_recording_calculates_cbu_and_sets_unpaid_status_without_disbursement()
    {
        $payload = [
            'member_id' => $this->member->id,
            'product_type' => 'Copra',
            'quantity' => 1000.00,
            'unit' => 'kg',
            'purchase_price' => 40.00,
            'source' => 'Farm 1',
            'remarks' => 'Grade A Copra',
            'production_date' => '2026-10-14',
            'status' => 'Completed',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/productions', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('production.gross_amount', '40000.00');
        $response->assertJsonPath('production.cbu_rate_per_kg', '0.5000');
        $response->assertJsonPath('production.cbu_deduction', '500.00');
        $response->assertJsonPath('production.net_amount', '39500.00');
        $response->assertJsonPath('production.payment_status', 'Unpaid');
        $response->assertJsonPath('production.paid_amount', '0.00');
        $response->assertJsonPath('production.remaining_balance', '39500.00');

        // Verify CBU contribution credited to member
        $this->member->refresh();
        $this->assertEquals(1500.00, (float)$this->member->cbu_balance);

        // Verify NO Cash Disbursement was created during production recording
        $this->assertEquals(0, CashDisbursementJournal::count());
    }

    public function test_partial_and_full_member_payments_create_cash_disbursement_and_update_balance()
    {
        // 1. Create a production: 1000kg @ 40 = 40,000. CBU @ 0.50 = 500. Net = 39,500.
        $production = Production::create([
            'member_id' => $this->member->id,
            'product_type' => 'Copra',
            'quantity' => 1000.00,
            'unit' => 'kg',
            'unit_price' => 40.00,
            'gross_amount' => 40000.00,
            'cbu_rate_per_kg' => 0.50,
            'cbu_deduction' => 500.00,
            'net_amount' => 39500.00,
            'cbu_deducted' => true,
            'cbu_deducted_at' => now(),
            'source' => 'Farm 1',
            'production_date' => '2026-10-14',
            'status' => 'Completed',
            'payment_status' => 'Unpaid',
            'paid_amount' => 0.00,
            'remaining_balance' => 39500.00,
        ]);

        // Seed initial cash receipt into CashReceiptsJournal to observe cash balance
        CashReceiptsJournal::create([
            'or_number' => 'OR-2026-0001',
            'receipt_date' => '2026-10-14',
            'received_from' => 'Initial Capital Inflow',
            'description' => 'Starting Cash',
            'source_of_income' => 'Share Capital',
            'amount_received' => 100000.00,
            'recorded_by' => 'admin',
        ]);

        // Initial cash balance = 100,000 - 0 = 100,000
        $dash = $this->actingAs($this->user)->getJson('/api/dashboard');
        $dash->assertJsonPath('cards.current_cash_balance', 100000);

        // 2. Make Partial Payment of 20,000
        $partialPayload = [
            'amount' => 20000.00,
            'payment_date' => '2026-10-14',
            'payment_method' => 'Cash',
            'remarks' => 'First tranche payment',
        ];

        $payRes1 = $this->actingAs($this->user)
            ->postJson("/api/productions/{$production->id}/pay", $partialPayload);

        $payRes1->assertStatus(201);
        $payRes1->assertJsonPath('production.payment_status', 'Partially Paid');
        $payRes1->assertJsonPath('production.paid_amount', '20000.00');
        $payRes1->assertJsonPath('production.remaining_balance', '19500.00');

        // Cash disbursement created
        $this->assertEquals(1, CashDisbursementJournal::count());
        $cdv1 = CashDisbursementJournal::first();
        $this->assertEquals(20000.00, (float)$cdv1->amount);
        $this->assertEquals('Juan Dela Cruz', $cdv1->payee);
        $this->assertEquals($production->id, $cdv1->production_id);

        // Current Cash Balance is updated ONLY by the amount paid: 100,000 - 20,000 = 80,000
        $dash = $this->actingAs($this->user)->getJson('/api/dashboard');
        $dash->assertJsonPath('cards.current_cash_balance', 80000);

        // 3. Complete Payment with Remaining 19,500
        $finalPayload = [
            'amount' => 19500.00,
            'payment_date' => '2026-10-15',
            'payment_method' => 'Cash',
            'remarks' => 'Final settlement',
        ];

        $payRes2 = $this->actingAs($this->user)
            ->postJson("/api/productions/{$production->id}/pay", $finalPayload);

        $payRes2->assertStatus(201);
        $payRes2->assertJsonPath('production.payment_status', 'Paid');
        $payRes2->assertJsonPath('production.paid_amount', '39500.00');
        $payRes2->assertJsonPath('production.remaining_balance', '0.00');

        // Second Cash disbursement created
        $this->assertEquals(2, CashDisbursementJournal::count());
        $this->assertEquals(39500.00, (float)CashDisbursementJournal::sum('amount'));

        // Current Cash Balance updated strictly by amount paid: 80,000 - 19,500 = 60,500
        $dash = $this->actingAs($this->user)->getJson('/api/dashboard');
        $dash->assertJsonPath('cards.current_cash_balance', 60500);

        // Verify CBU balance was NOT touched or re-deducted during payments
        $this->member->refresh();
        $this->assertEquals(1000.00, (float)$this->member->cbu_balance);
    }

    public function test_prevents_duplicate_payments_and_overpayment()
    {
        $production = Production::create([
            'member_id' => $this->member->id,
            'product_type' => 'Copra',
            'quantity' => 500.00,
            'unit' => 'kg',
            'unit_price' => 30.00,
            'gross_amount' => 15000.00,
            'cbu_rate_per_kg' => 0.50,
            'cbu_deduction' => 250.00,
            'net_amount' => 14750.00,
            'cbu_deducted' => true,
            'source' => 'Farm 1',
            'production_date' => '2026-10-14',
            'status' => 'Completed',
            'payment_status' => 'Unpaid',
            'paid_amount' => 0.00,
            'remaining_balance' => 14750.00,
        ]);

        // Attempt overpayment
        $overpayRes = $this->actingAs($this->user)
            ->postJson("/api/productions/{$production->id}/pay", [
                'amount' => 15000.00,
                'payment_date' => '2026-10-14',
                'payment_method' => 'Cash',
            ]);

        $overpayRes->assertStatus(422);

        // Pay exact full amount
        $payRes = $this->actingAs($this->user)
            ->postJson("/api/productions/{$production->id}/pay", [
                'amount' => 14750.00,
                'payment_date' => '2026-10-14',
                'payment_method' => 'Cash',
            ]);
        $payRes->assertStatus(201);
        $this->assertEquals('Paid', $payRes->json('production.payment_status'));

        // Attempt duplicate payment on fully paid production
        $dupRes = $this->actingAs($this->user)
            ->postJson("/api/productions/{$production->id}/pay", [
                'amount' => 100.00,
                'payment_date' => '2026-10-14',
                'payment_method' => 'Cash',
            ]);

        $dupRes->assertStatus(422);
    }
}

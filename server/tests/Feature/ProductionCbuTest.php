<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Member;
use App\Models\Production;
use App\Models\Setting;
use App\Models\ShareCapitalTransaction;

class ProductionCbuTest extends TestCase
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
            'firstname' => 'Pedro',
            'lastname' => 'Penduko',
            'gender' => 'Male',
            'birthdate' => '1985-05-15',
            'address' => 'Brgy. Tabuc, Pontevedra',
            'contact_number' => '09123456789',
            'email' => 'pedro@example.com',
            'membership_date' => '2026-01-10',
            'status' => 'Active',
            'cbu_balance' => 1000.00,
            'paid_up_capital' => 5000.00,
        ]);

        // Configure cooperative CBU rate policy
        Setting::setVal('cbu_rate_per_kg', '0.50');
    }

    public function test_production_recording_calculates_and_credits_cbu_transaction()
    {
        $payload = [
            'member_id' => $this->member->id,
            'product_type' => 'Copra',
            'quantity' => 1000.00,
            'unit' => 'kg',
            'purchase_price' => 35.00,
            'source' => 'Farm 1',
            'remarks' => 'High quality copra',
            'production_date' => '2026-09-24',
            'status' => 'Completed',
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/productions', $payload);

        $response->assertStatus(201);
        $response->assertJsonPath('production.gross_amount', '35000.00');
        $response->assertJsonPath('production.cbu_rate_per_kg', '0.5000');
        $response->assertJsonPath('production.cbu_deduction', '500.00');
        $response->assertJsonPath('production.net_amount', '34500.00');
        $response->assertJsonPath('production.cbu_deducted', true);

        // 1. Verify Member CBU balance updated: 1000 + 500 = 1500
        $this->member->refresh();
        $this->assertEquals(1500.00, (float)$this->member->cbu_balance);

        // 2. Verify ShareCapitalTransaction created
        $cbuTx = ShareCapitalTransaction::where('member_id', $this->member->id)
            ->where('transaction_type', 'CBU Contribution')
            ->first();

        $this->assertNotNull($cbuTx);
        $this->assertEquals(500.00, (float)$cbuTx->amount);
        $this->assertEquals(1500.00, (float)$cbuTx->balance_after);
        $this->assertEquals(1000.00, (float)$cbuTx->kilograms);
        $this->assertEquals(35.00, (float)$cbuTx->unit_price);
        $this->assertEquals(35000.00, (float)$cbuTx->gross_amount);
        $this->assertEquals(0.50, (float)$cbuTx->cbu_rate_per_kg);
        $this->assertEquals(34500.00, (float)$cbuTx->net_amount);

        // 3. Verify link between Production and CBU transaction
        $production = Production::first();
        $this->assertEquals($cbuTx->id, $production->cbu_transaction_id);
    }

    public function test_updating_production_recalculates_and_syncs_cbu_balance()
    {
        // Initial creation: 1000 kg @ ₱35 => CBU = ₱500 => balance = 1500
        $production = Production::create([
            'member_id' => $this->member->id,
            'product_type' => 'Copra',
            'quantity' => 1000.00,
            'unit' => 'kg',
            'unit_price' => 35.00,
            'gross_amount' => 35000.00,
            'cbu_rate_per_kg' => 0.50,
            'cbu_deduction' => 500.00,
            'net_amount' => 34500.00,
            'source' => 'Farm 1',
            'production_date' => '2026-09-24',
            'status' => 'Completed',
        ]);

        $cbuTx = ShareCapitalTransaction::create([
            'member_id' => $this->member->id,
            'production_id' => $production->id,
            'transaction_type' => 'CBU Contribution',
            'transaction_date' => '2026-09-24',
            'reference_no' => 'CBU-PRD-2026-0001',
            'amount' => 500.00,
            'balance_after' => 1500.00,
            'source' => 'Production Delivery (Copra)',
        ]);

        $production->update([
            'cbu_deducted' => true,
            'cbu_transaction_id' => $cbuTx->id,
        ]);

        $this->member->update(['cbu_balance' => 1500.00]);

        // Update quantity from 1000kg to 2000kg => CBU should be ₱1,000 => balance should be 1000 + 1000 = 2000
        $updatePayload = [
            'member_id' => $this->member->id,
            'product_type' => 'Copra',
            'quantity' => 2000.00,
            'unit' => 'kg',
            'purchase_price' => 35.00,
            'source' => 'Farm 1',
            'production_date' => '2026-09-24',
            'status' => 'Completed',
        ];

        $response = $this->actingAs($this->user)
            ->putJson("/api/productions/{$production->id}", $updatePayload);

        $response->assertStatus(200);
        $response->assertJsonPath('production.cbu_deduction', '1000.00');

        $this->member->refresh();
        $this->assertEquals(2000.00, (float)$this->member->cbu_balance);

        $cbuTx->refresh();
        $this->assertEquals(1000.00, (float)$cbuTx->amount);
        $this->assertEquals(2000.00, (float)$cbuTx->balance_after);
    }

    public function test_deleting_production_reverses_cbu_balance()
    {
        $production = Production::create([
            'member_id' => $this->member->id,
            'product_type' => 'Copra',
            'quantity' => 1000.00,
            'unit' => 'kg',
            'unit_price' => 35.00,
            'gross_amount' => 35000.00,
            'cbu_rate_per_kg' => 0.50,
            'cbu_deduction' => 500.00,
            'net_amount' => 34500.00,
            'source' => 'Farm 1',
            'production_date' => '2026-09-24',
            'status' => 'Completed',
        ]);

        $cbuTx = ShareCapitalTransaction::create([
            'member_id' => $this->member->id,
            'production_id' => $production->id,
            'transaction_type' => 'CBU Contribution',
            'transaction_date' => '2026-09-24',
            'reference_no' => 'CBU-PRD-2026-0001',
            'amount' => 500.00,
            'balance_after' => 1500.00,
            'source' => 'Production Delivery (Copra)',
        ]);

        $production->update([
            'cbu_deducted' => true,
            'cbu_transaction_id' => $cbuTx->id,
        ]);

        $this->member->update(['cbu_balance' => 1500.00]);

        // Delete production
        $response = $this->actingAs($this->user)
            ->deleteJson("/api/productions/{$production->id}");

        $response->assertStatus(200);

        // Member CBU balance should be reversed from 1500 back to 1000
        $this->member->refresh();
        $this->assertEquals(1000.00, (float)$this->member->cbu_balance);

        // CBU transaction should be deleted
        $this->assertDatabaseMissing('share_capital_transactions', ['id' => $cbuTx->id]);
        $this->assertDatabaseMissing('productions', ['id' => $production->id]);
    }
}

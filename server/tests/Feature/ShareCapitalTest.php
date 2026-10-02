<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\User;
use App\Models\CashReceiptsJournal;
use App\Models\ShareCapitalTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShareCapitalTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Member $member;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
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
            'address' => 'Ivisan, Capiz',
            'contact_number' => '09123456789',
            'membership_date' => '2026-01-10',
            'status' => 'Active',
        ]);
    }

    public function test_get_share_capital_requires_auth(): void
    {
        $response = $this->getJson('/api/share-capital');
        $response->assertStatus(401);
    }

    public function test_subscribe_share_capital(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/share-capital/subscribe', [
            'member_id' => $this->member->id,
            'subscribed_shares' => 50,
            'share_par_value' => 100.00,
            'remarks' => 'Initial subscription',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('members', [
            'id' => $this->member->id,
            'subscribed_shares' => 50,
            'share_par_value' => 100.00,
            'subscribed_capital' => 5000.00,
        ]);

        $this->assertDatabaseHas('share_capital_transactions', [
            'member_id' => $this->member->id,
            'transaction_type' => 'Subscription',
            'amount' => 5000.00,
        ]);
    }

    public function test_contribute_share_capital_and_syncs_with_cash_receipts(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/share-capital/contribute', [
            'member_id' => $this->member->id,
            'amount' => 1500.00,
            'transaction_date' => '2026-09-23',
            'payment_method' => 'Cash',
            'reference_no' => 'OR-2026-0099',
            'remarks' => 'First share capital installment',
            'sync_cash_receipt' => true,
        ]);

        $response->assertStatus(201);

        // Verify member paid up capital updated
        $this->assertDatabaseHas('members', [
            'id' => $this->member->id,
            'paid_up_capital' => 1500.00,
        ]);

        // Verify transaction logged
        $this->assertDatabaseHas('share_capital_transactions', [
            'member_id' => $this->member->id,
            'transaction_type' => 'Share Capital Contribution',
            'amount' => 1500.00,
            'reference_no' => 'OR-2026-0099',
            'balance_after' => 1500.00,
        ]);

        // Verify Cash Receipts Journal entry created in Books of Accounts
        $this->assertDatabaseHas('cash_receipts_journals', [
            'or_number' => 'OR-2026-0099',
            'source_of_income' => 'Share Capital',
            'amount_received' => 1500.00,
        ]);
    }

    public function test_record_membership_fee_separate_from_share_capital(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/share-capital/membership-fee', [
            'member_id' => $this->member->id,
            'amount' => 250.00,
            'payment_date' => '2026-09-23',
            'payment_method' => 'Cash',
            'or_number' => 'OR-2026-0100',
            'remarks' => 'New membership entry fee',
            'sync_cash_receipt' => true,
        ]);

        $response->assertStatus(200);

        // Verify member fee is recorded as Paid
        $this->assertDatabaseHas('members', [
            'id' => $this->member->id,
            'membership_fee_status' => 'Paid',
            'membership_fee_amount' => 250.00,
            'membership_fee_or' => 'OR-2026-0100',
            'paid_up_capital' => 0.00, // MUST REMAIN 0.00 - strictly separate!
        ]);

        // Verify Cash Receipts Journal created with source = Membership Fee
        $this->assertDatabaseHas('cash_receipts_journals', [
            'or_number' => 'OR-2026-0100',
            'source_of_income' => 'Membership Fee',
            'amount_received' => 250.00,
        ]);
    }

    public function test_get_member_share_capital_ledger(): void
    {
        // First contribute
        $this->actingAs($this->admin)->postJson('/api/share-capital/contribute', [
            'member_id' => $this->member->id,
            'amount' => 2000.00,
            'transaction_date' => '2026-09-23',
            'payment_method' => 'Cash',
            'reference_no' => 'OR-2026-0101',
        ]);

        $response = $this->actingAs($this->admin)->getJson("/api/share-capital/member/{$this->member->id}");
        $response->assertStatus(200)
            ->assertJsonStructure([
                'member',
                'summary' => [
                    'subscribed_shares',
                    'subscribed_capital',
                    'paid_up_capital',
                    'cbu_balance',
                    'total_equity',
                    'membership_fee_status',
                ],
                'transactions',
            ]);
    }
}

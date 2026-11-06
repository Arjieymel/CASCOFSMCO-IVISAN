<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add payment tracking fields to sales table
        Schema::table('sales', function (Blueprint $table) {
            $table->decimal('paid_amount', 15, 2)->default(0.00)->after('total_amount');
            $table->decimal('remaining_balance', 15, 2)->default(0.00)->after('paid_amount');
            $table->foreignId('cash_receipt_id')->nullable()->after('remaining_balance')->constrained('cash_receipts_journals')->nullOnDelete();
        });

        // 2. Add sale_id reference to cash_receipts_journals table
        Schema::table('cash_receipts_journals', function (Blueprint $table) {
            $table->foreignId('sale_id')->nullable()->after('user_id')->constrained('sales')->nullOnDelete();
        });

        // 3. Create sale_payments table for sale payment tracking
        Schema::create('sale_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->foreignId('cash_receipt_id')->nullable()->constrained('cash_receipts_journals')->nullOnDelete();
            $table->string('or_number', 100);
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->string('payment_method', 50)->default('Cash');
            $table->text('remarks')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('recorded_by', 100)->default('admin');
            $table->timestamps();
        });

        // 4. Backfill existing sales data and reconcile with Cash Receipts Journal
        $existingSales = DB::table('sales')->get();
        foreach ($existingSales as $sale) {
            $totalAmount = (float)($sale->total_amount ?? 0);
            $isPaid = (strcasecmp($sale->status, 'Paid') === 0);

            $paidAmount = $isPaid ? $totalAmount : 0.00;
            $remaining = $isPaid ? 0.00 : $totalAmount;

            $cashReceiptId = null;

            if ($isPaid && $paidAmount > 0) {
                // Generate unique OR number
                $year = Carbon::parse($sale->sale_date)->year;
                $allOrs = DB::table('cash_receipts_journals')
                    ->where('or_number', 'like', "OR-{$year}-%")
                    ->pluck('or_number');

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
                    $candidateOr = sprintf("OR-%d-%04d", $year, $seq);
                    $exists = DB::table('cash_receipts_journals')->where('or_number', $candidateOr)->exists();
                    if (!$exists) break;
                    $seq++;
                } while ($exists);

                $receiptDate = $sale->sale_date ? Carbon::parse($sale->sale_date)->format('Y-m-d') : date('Y-m-d');
                $method = $sale->payment_method ?: 'Cash';
                $remarks = "[Method: {$method}] Sales payment for {$sale->invoice_no}";

                $cashReceiptId = DB::table('cash_receipts_journals')->insertGetId([
                    'or_number' => $candidateOr,
                    'receipt_date' => $receiptDate,
                    'received_from' => $sale->buyer,
                    'description' => "Sales Invoice: {$sale->invoice_no} - {$sale->product} ({$sale->quantity} {$sale->unit})",
                    'source_of_income' => 'Sales',
                    'amount_received' => $paidAmount,
                    'recorded_by' => 'admin',
                    'user_id' => null,
                    'sale_id' => $sale->id,
                    'remarks' => $remarks,
                    'created_at' => $sale->created_at ?: now(),
                    'updated_at' => $sale->updated_at ?: now(),
                ]);

                DB::table('sale_payments')->insert([
                    'sale_id' => $sale->id,
                    'cash_receipt_id' => $cashReceiptId,
                    'or_number' => $candidateOr,
                    'payment_date' => $receiptDate,
                    'amount' => $paidAmount,
                    'payment_method' => $method,
                    'remarks' => $remarks,
                    'user_id' => null,
                    'recorded_by' => 'admin',
                    'created_at' => $sale->created_at ?: now(),
                    'updated_at' => $sale->updated_at ?: now(),
                ]);
            }

            DB::table('sales')->where('id', $sale->id)->update([
                'paid_amount' => $paidAmount,
                'remaining_balance' => $remaining,
                'cash_receipt_id' => $cashReceiptId,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sale_payments');

        Schema::table('cash_receipts_journals', function (Blueprint $table) {
            $table->dropForeign(['sale_id']);
            $table->dropColumn('sale_id');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['cash_receipt_id']);
            $table->dropColumn([
                'paid_amount',
                'remaining_balance',
                'cash_receipt_id',
            ]);
        });
    }
};

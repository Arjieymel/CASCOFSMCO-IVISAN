<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\Production;
use App\Models\Sale;
use App\Models\Member;
use App\Models\Task;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Generate report data based on type and filters.
     */
    public function index(Request $request)
    {
        $request->validate([
            'report_type' => 'required|string|in:Production,Sales,Member,Financial,Task,Inventory',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $type = $request->report_type;
        $startDate = $request->input('start_date', Carbon::now()->subMonths(12)->format('Y-m-d'));
        $endDate = $request->input('end_date', Carbon::now()->format('Y-m-d'));

        // Format dates for query
        $start = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->endOfDay();

        $data = [
            'report_type' => $type,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'generated_at' => Carbon::now()->toDateTimeString(),
            'generated_by_user' => $request->user()->username,
            'summary' => [],
            'details' => []
        ];

        switch ($type) {
            case 'Production':
                $productions = Production::with('member')
                    ->whereBetween('production_date', [$start, $end])
                    ->orderBy('production_date', 'desc')
                    ->get();

                $totalQty = $productions->where('status', 'Completed')->sum('quantity') + 
                            $productions->where('status', 'Approved')->sum('quantity');
                $avgQty = $productions->count() > 0 ? $totalQty / $productions->count() : 0;

                // Group by product type
                $byProductType = Production::whereBetween('production_date', [$start, $end])
                    ->select('product_type', DB::raw('SUM(quantity) as total_qty'), DB::raw('COUNT(*) as count'))
                    ->groupBy('product_type')
                    ->get();

                $data['summary'] = [
                    'total_records' => $productions->count(),
                    'total_quantity' => round($totalQty, 2),
                    'average_quantity' => round($avgQty, 2),
                    'by_product_type' => $byProductType
                ];

                $data['details'] = $productions->map(function($p) {
                    return [
                        'id' => $p->id,
                        'date' => $p->production_date->format('Y-m-d'),
                        'member_code' => $p->member?->member_code,
                        'member_name' => $p->member?->firstname . ' ' . $p->member?->lastname,
                        'product_type' => $p->product_type,
                        'quantity' => $p->quantity,
                        'unit' => $p->unit,
                        'source' => $p->source,
                        'status' => $p->status,
                        'remarks' => $p->remarks
                    ];
                });
                break;

            case 'Sales':
                $sales = Sale::whereBetween('sale_date', [$start, $end])
                    ->orderBy('sale_date', 'desc')
                    ->get();

                $totalSales = $sales->where('status', 'Paid')->sum('total_amount');
                $totalQty = $sales->where('status', 'Paid')->sum('quantity');
                $avgInvoice = $sales->count() > 0 ? $totalSales / $sales->count() : 0;

                $byProduct = Sale::whereBetween('sale_date', [$start, $end])
                    ->select('product', DB::raw('SUM(quantity) as total_qty'), DB::raw('SUM(total_amount) as total_sales'))
                    ->groupBy('product')
                    ->get();

                $byPaymentMethod = Sale::whereBetween('sale_date', [$start, $end])
                    ->select('payment_method', DB::raw('SUM(total_amount) as total_sales'), DB::raw('COUNT(*) as count'))
                    ->groupBy('payment_method')
                    ->get();

                $data['summary'] = [
                    'total_records' => $sales->count(),
                    'total_sales_amount' => round($totalSales, 2),
                    'total_quantity_sold' => round($totalQty, 2),
                    'average_invoice_value' => round($avgInvoice, 2),
                    'by_product' => $byProduct,
                    'by_payment_method' => $byPaymentMethod
                ];

                $data['details'] = $sales->map(function($s) {
                    return [
                        'id' => $s->id,
                        'invoice_no' => $s->invoice_no,
                        'date' => $s->sale_date->format('Y-m-d'),
                        'buyer' => $s->buyer,
                        'product' => $s->product,
                        'quantity' => $s->quantity,
                        'unit' => $s->unit,
                        'unit_price' => $s->unit_price,
                        'total_amount' => $s->total_amount,
                        'payment_method' => $s->payment_method,
                        'status' => $s->status,
                        'remarks' => $s->remarks
                    ];
                });
                break;

            case 'Member':
                $members = Member::whereBetween('membership_date', [$start, $end])
                    ->orderBy('membership_date', 'desc')
                    ->get();

                $byGender = Member::whereBetween('membership_date', [$start, $end])
                    ->select('gender', DB::raw('COUNT(*) as count'))
                    ->groupBy('gender')
                    ->get();

                $byStatus = Member::whereBetween('membership_date', [$start, $end])
                    ->select('status', DB::raw('COUNT(*) as count'))
                    ->groupBy('status')
                    ->get();

                $data['summary'] = [
                    'total_registered' => $members->count(),
                    'by_gender' => $byGender,
                    'by_status' => $byStatus,
                ];

                $data['details'] = $members->map(function($m) {
                    return [
                        'id' => $m->id,
                        'member_code' => $m->member_code,
                        'name' => $m->firstname . ' ' . $m->lastname,
                        'gender' => $m->gender,
                        'birthdate' => $m->birthdate,
                        'age' => $m->age,
                        'contact_number' => $m->contact_number,
                        'email' => $m->email,
                        'membership_date' => $m->membership_date,
                        'status' => $m->status
                    ];
                });
                break;

            case 'Financial':
                // Financial summary maps sales income and estimates expenditures
                $sales = Sale::whereBetween('sale_date', [$start, $end])
                    ->where('status', 'Paid')
                    ->get();
                
                $revenue = $sales->sum('total_amount');
                
                // Assume production payouts to farmers at e.g. 80% of wholesale sales price or fixed rate per kg (e.g. Php 30/kg)
                // Let's compute actual production quantities during this period
                $productions = Production::whereBetween('production_date', [$start, $end])
                    ->whereIn('status', ['Completed', 'Approved'])
                    ->get();

                $copraProduced = $productions->where('product_type', 'Copra')->sum('quantity');
                $othersProduced = $productions->where('product_type', '!=', 'Copra')->sum('quantity');

                // Estimated payout: PHP 35 per kg of Copra, PHP 10 per kg of others
                $estimatedPayout = ($copraProduced * 35.0) + ($othersProduced * 10.0);
                $netIncome = $revenue - $estimatedPayout;

                $data['summary'] = [
                    'total_revenue' => round($revenue, 2),
                    'estimated_member_payouts' => round($estimatedPayout, 2),
                    'net_surplus' => round($netIncome, 2),
                    'copra_kg' => round($copraProduced, 2),
                    'other_products_kg' => round($othersProduced, 2)
                ];

                // Details show consolidated monthly financials
                $monthlyFinancials = DB::table('sales')
                    ->select(
                        DB::raw("DATE_FORMAT(sale_date, '%Y-%m') as month"),
                        DB::raw("SUM(CASE WHEN status = 'Paid' THEN total_amount ELSE 0 END) as sales_revenue")
                    )
                    ->whereBetween('sale_date', [$start, $end])
                    ->groupBy('month')
                    ->orderBy('month', 'desc')
                    ->get();

                $data['details'] = $monthlyFinancials->map(function($m) use ($start, $end) {
                    $monthStart = Carbon::parse($m->month . '-01')->startOfMonth();
                    $monthEnd = Carbon::parse($m->month . '-01')->endOfMonth();
                    
                    // Filter boundaries
                    $actualStart = $monthStart->gt($start) ? $monthStart : $start;
                    $actualEnd = $monthEnd->lt($end) ? $monthEnd : $end;

                    $prodMonth = Production::whereBetween('production_date', [$actualStart, $actualEnd])
                        ->whereIn('status', ['Completed', 'Approved'])
                        ->get();
                    
                    $payout = ($prodMonth->where('product_type', 'Copra')->sum('quantity') * 35.0) +
                              ($prodMonth->where('product_type', '!=', 'Copra')->sum('quantity') * 10.0);

                    return [
                        'month' => $m->month,
                        'revenue' => round($m->sales_revenue, 2),
                        'estimated_payout' => round($payout, 2),
                        'net_profit' => round($m->sales_revenue - $payout, 2)
                    ];
                });
                break;

            case 'Task':
                // Auto mark overdue
                Task::where('status', '!=', 'Completed')
                    ->where('status', '!=', 'Overdue')
                    ->where('due_date', '<', Carbon::today()->format('Y-m-d'))
                    ->update(['status' => 'Overdue']);

                $tasks = Task::with('assignee')
                    ->whereBetween('created_at', [$start, $end])
                    ->get();

                $completed = $tasks->where('status', 'Completed')->count();
                $pending = $tasks->where('status', 'Pending')->count();
                $inProgress = $tasks->where('status', 'In Progress')->count();
                $overdue = $tasks->where('status', 'Overdue')->count();

                $completionRate = $tasks->count() > 0 ? ($completed / $tasks->count()) * 100 : 0;

                $data['summary'] = [
                    'total_tasks' => $tasks->count(),
                    'completed' => $completed,
                    'pending' => $pending,
                    'in_progress' => $inProgress,
                    'overdue' => $overdue,
                    'completion_rate' => round($completionRate, 2)
                ];

                $data['details'] = $tasks->map(function($t) {
                    return [
                        'id' => $t->id,
                        'title' => $t->title,
                        'assignee' => $t->assignee?->username ?? 'Unassigned',
                        'priority' => $t->priority,
                        'status' => $t->status,
                        'progress' => $t->progress,
                        'due_date' => $t->due_date->format('Y-m-d'),
                        'created_at' => $t->created_at->format('Y-m-d')
                    ];
                });
                break;

            case 'Inventory':
                // Inventory calculates stock level as Production Qty (Completed/Approved) - Sales Qty (Paid)
                $prodInventory = Production::whereIn('status', ['Completed', 'Approved'])
                    ->select('product_type', DB::raw('SUM(quantity) as prod_qty'))
                    ->groupBy('product_type')
                    ->get()
                    ->pluck('prod_qty', 'product_type')
                    ->toArray();

                $salesInventory = Sale::where('status', 'Paid')
                    ->select('product', DB::raw('SUM(quantity) as sold_qty'))
                    ->groupBy('product')
                    ->get()
                    ->pluck('sold_qty', 'product')
                    ->toArray();

                // Merge and calculate stock
                $allProducts = array_unique(array_merge(array_keys($prodInventory), array_keys($salesInventory)));
                
                $inventory = [];
                $lowStockAlerts = 0;

                foreach ($allProducts as $prodName) {
                    $prodQty = $prodInventory[$prodName] ?? 0;
                    $soldQty = $salesInventory[$prodName] ?? 0;
                    $stock = $prodQty - $soldQty;

                    // Floor stock to 0 if negative
                    if ($stock < 0) $stock = 0;

                    // Set threshold
                    $threshold = 500.00; // Low stock threshold 500kg
                    $isLow = $stock < $threshold;
                    if ($isLow) {
                        $lowStockAlerts++;
                    }

                    $inventory[] = [
                        'product_name' => $prodName,
                        'total_produced' => round($prodQty, 2),
                        'total_sold' => round($soldQty, 2),
                        'current_stock' => round($stock, 2),
                        'status' => $isLow ? 'Low Stock' : 'Good Stock',
                        'alert_level' => $isLow ? 'Warning' : 'Normal'
                    ];
                }

                $data['summary'] = [
                    'total_product_categories' => count($allProducts),
                    'low_stock_categories' => $lowStockAlerts,
                    'low_stock_threshold' => 500.00
                ];

                $data['details'] = $inventory;
                break;
        }

        // Save report record to database
        Report::create([
            'report_type' => $type,
            'generated_by' => $request->user()->id,
            'generated_at' => Carbon::now(),
            'file_path' => null // Exported files generated dynamically
        ]);

        return response()->json($data);
    }
}

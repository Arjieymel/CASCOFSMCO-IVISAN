<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\Production;
use App\Models\Sale;
use App\Models\Task;
use App\Models\ActivityLog;
use App\Models\CashDisbursementJournal;
use App\Models\CashReceiptsJournal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get dashboard summary and analytics data including Books of Accounts integration.
     */
    public function index(Request $request)
    {
        // 1. Core counters
        $totalMembers = Member::count();
        $totalProduction = Production::whereIn('status', ['Completed', 'Approved'])->sum('quantity');
        $totalSalesAmount = Sale::where('status', 'Paid')->sum('total_amount');
        
        // Auto mark overdue tasks first
        Task::where('status', '!=', 'Completed')
            ->where('status', '!=', 'Overdue')
            ->where('due_date', '<', Carbon::today()->format('Y-m-d'))
            ->update(['status' => 'Overdue']);
            
        $pendingTasks = Task::whereIn('status', ['Pending', 'In Progress'])->count();

        // 2. Books of Accounts Cards Metrics
        // Total Cash In: sourced exclusively from Cash Receipts Journal
        $totalCashIn = CashReceiptsJournal::sum('amount_received');

        // Total Cash Out: sourced exclusively from Cash Disbursement Journal
        $totalCashOut = CashDisbursementJournal::sum('amount');

        // Current Cash Balance = Total Cash Receipts - Total Cash Disbursements
        $currentCashBalance = $totalCashIn - $totalCashOut;

        // Total Sales: sourced from the existing Sales Recording module (Sale model)
        $totalSales = $totalSalesAmount;

        // 3. Today's Stats
        $todayProduction = Production::whereDate('production_date', Carbon::today())
            ->whereIn('status', ['Completed', 'Approved'])
            ->sum('quantity');

        $todaySales = Sale::whereDate('sale_date', Carbon::today())
            ->where('status', 'Paid')
            ->sum('total_amount');

        // 4. Latest Registered Member
        $latestMember = Member::orderBy('membership_date', 'desc')->first();

        // 5. Inventory Stock Alert (Threshold 500kg)
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

        $lowStockAlerts = [];
        $allProducts = array_unique(array_merge(array_keys($prodInventory), array_keys($salesInventory)));
        
        // Products explicitly excluded from Low Stock Alert monitoring (Coir Fiber and Dessicated/Desiccated Coconut)
        $excludedAlertProducts = ['coir fiber', 'dessicated coconut', 'desiccated coconut'];

        // Exclude unmonitored products before calculating low stock alerts
        $monitoredProducts = array_filter($allProducts, function ($productName) use ($excludedAlertProducts) {
            return !in_array(strtolower(trim($productName)), $excludedAlertProducts, true);
        });

        foreach ($monitoredProducts as $productName) {
            $produced = $prodInventory[$productName] ?? 0;
            $sold = $salesInventory[$productName] ?? 0;
            $stock = $produced - $sold;
            if ($stock < 0) $stock = 0;

            if ($stock < 500) {
                $lowStockAlerts[] = [
                    'product' => $productName,
                    'stock' => round($stock, 2)
                ];
            }
        }

        // 6. Recent Accounting Transactions
        $recentTransactions = collect();

        CashDisbursementJournal::latest()->take(5)->get()->each(function($r) use ($recentTransactions) {
            $recentTransactions->push([
                'type' => 'Cash Disbursement',
                'reference' => $r->voucher_number,
                'date' => $r->disbursement_date->format('Y-m-d'),
                'description' => "Payee: {$r->payee} ({$r->expense_account})",
                'amount' => -(float)$r->amount,
                'created_at' => $r->created_at->toDateTimeString()
            ]);
        });

        CashReceiptsJournal::latest()->take(5)->get()->each(function($r) use ($recentTransactions) {
            $recentTransactions->push([
                'type' => 'Cash Receipt',
                'reference' => $r->or_number,
                'date' => $r->receipt_date->format('Y-m-d'),
                'description' => "From: {$r->received_from} ({$r->source_of_income})",
                'amount' => (float)$r->amount_received,
                'created_at' => $r->created_at->toDateTimeString()
            ]);
        });

        $sortedRecentAccounting = $recentTransactions
            ->sortByDesc('created_at')
            ->values()
            ->take(8);

        // 7. Recent Activities
        $recentActivities = ActivityLog::orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function($log) {
                return [
                    'id' => $log->id,
                    'username' => $log->username ?? 'System',
                    'action' => $log->action,
                    'time_ago' => $log->created_at->diffForHumans(),
                    'created_at' => $log->created_at->toDateTimeString()
                ];
            });

        // 8. Charts - Production Last 6 Months
        $productionChart = DB::table('productions')
            ->select(
                DB::raw("DATE_FORMAT(production_date, '%Y-%m') as month"),
                DB::raw("SUM(quantity) as total_qty")
            )
            ->whereIn('status', ['Completed', 'Approved'])
            ->where('production_date', '>=', Carbon::now()->subMonths(5)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month', 'asc')
            ->get();

        // 9. Charts - Sales Last 6 Months
        $salesChart = DB::table('sales')
            ->select(
                DB::raw("DATE_FORMAT(sale_date, '%Y-%m') as month"),
                DB::raw("SUM(total_amount) as total_revenue")
            )
            ->where('status', 'Paid')
            ->where('sale_date', '>=', Carbon::now()->subMonths(5)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month', 'asc')
            ->get();

        $months = [];
        $productionMonthlyData = [];
        $salesMonthlyData = [];
        
        for ($i = 5; $i >= 0; $i--) {
            $m = Carbon::now()->subMonths($i)->format('Y-m');
            $months[] = Carbon::now()->subMonths($i)->format('F');
            
            $prodMatch = $productionChart->firstWhere('month', $m);
            $productionMonthlyData[] = $prodMatch ? round($prodMatch->total_qty, 2) : 0;
            
            $saleMatch = $salesChart->firstWhere('month', $m);
            $salesMonthlyData[] = $saleMatch ? round($saleMatch->total_revenue, 2) : 0;
        }

        return response()->json([
            'cards' => [
                'total_members' => $totalMembers,
                'total_production_kg' => round($totalProduction, 2),
                'total_sales_amount' => round($totalSales, 2),
                'pending_tasks' => $pendingTasks,
                // Accounting Metrics
                'total_cash_in' => round($totalCashIn, 2),
                'total_cash_out' => round($totalCashOut, 2),
                'current_cash_balance' => round($currentCashBalance, 2),
                'total_sales' => round($totalSales, 2),
            ],
            'quick_stats' => [
                'today_production_kg' => round($todayProduction, 2),
                'today_sales_amount' => round($todaySales, 2),
                'latest_member' => $latestMember ? [
                    'name' => $latestMember->firstname . ' ' . $latestMember->lastname,
                    'code' => $latestMember->member_code,
                    'date' => $latestMember->membership_date
                ] : null,
                'low_stock_alerts' => $lowStockAlerts
            ],
            'recent_activities' => $recentActivities,
            'recent_accounting_transactions' => $sortedRecentAccounting,
            'charts' => [
                'labels' => $months,
                'production' => $productionMonthlyData,
                'sales' => $salesMonthlyData
            ]
        ]);
    }
}

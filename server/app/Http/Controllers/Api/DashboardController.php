<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\Production;
use App\Models\Sale;
use App\Models\Task;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get dashboard summary and analytics data.
     */
    public function index(Request $request)
    {
        // 1. Core counters
        $totalMembers = Member::count();
        
        $totalProduction = Production::whereIn('status', ['Completed', 'Approved'])->sum('quantity');
        $totalSales = Sale::where('status', 'Paid')->sum('total_amount');
        
        // Auto mark overdue tasks first
        Task::where('status', '!=', 'Completed')
            ->where('status', '!=', 'Overdue')
            ->where('due_date', '<', Carbon::today()->format('Y-m-d'))
            ->update(['status' => 'Overdue']);
            
        $pendingTasks = Task::whereIn('status', ['Pending', 'In Progress'])->count();

        // 2. Today's Stats
        $todayProduction = Production::whereDate('production_date', Carbon::today())
            ->whereIn('status', ['Completed', 'Approved'])
            ->sum('quantity');

        $todaySales = Sale::whereDate('sale_date', Carbon::today())
            ->where('status', 'Paid')
            ->sum('total_amount');

        // 3. Latest Registered Member
        $latestMember = Member::orderBy('membership_date', 'desc')->first();

        // 4. Inventory Stock Alert (Threshold 500kg)
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
        
        foreach ($allProducts as $productName) {
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

        // 5. Recent Activities
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

        // 6. Charts - Production Last 6 Months
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

        // 7. Charts - Sales Last 6 Months
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

        // Standardize monthly labels for charting (past 6 months)
        $months = [];
        $productionMonthlyData = [];
        $salesMonthlyData = [];
        
        for ($i = 5; $i >= 0; $i--) {
            $m = Carbon::now()->subMonths($i)->format('Y-m');
            $months[] = Carbon::now()->subMonths($i)->format('F');
            
            // Production
            $prodMatch = $productionChart->firstWhere('month', $m);
            $productionMonthlyData[] = $prodMatch ? round($prodMatch->total_qty, 2) : 0;
            
            // Sales
            $saleMatch = $salesChart->firstWhere('month', $m);
            $salesMonthlyData[] = $saleMatch ? round($saleMatch->total_revenue, 2) : 0;
        }

        return response()->json([
            'cards' => [
                'total_members' => $totalMembers,
                'total_production_kg' => round($totalProduction, 2),
                'total_sales_amount' => round($totalSales, 2),
                'pending_tasks' => $pendingTasks
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
            'charts' => [
                'labels' => $months,
                'production' => $productionMonthlyData,
                'sales' => $salesMonthlyData
            ]
        ]);
    }
}

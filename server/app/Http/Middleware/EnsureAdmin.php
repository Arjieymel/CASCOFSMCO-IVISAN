<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->user() || !in_array($request->user()->role, ['Administrator', 'Staff'])) {
            return response()->json([
                'message' => 'Access denied. Books of Accounts is accessible by Administrator and Staff only.'
            ], 403);
        }

        return $next($request);
    }
}

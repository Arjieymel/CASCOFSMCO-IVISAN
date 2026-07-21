<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->user() || $request->user()->role !== 'Administrator') {
            return response()->json([
                'message' => 'Access denied. Books of Accounts is accessible by Administrator only.'
            ], 403);
        }

        return $next($request);
    }
}

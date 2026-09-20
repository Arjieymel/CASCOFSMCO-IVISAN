<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class SettingController extends Controller
{
    /**
     * Get all cooperative settings.
     */
    public function index()
    {
        $settings = [
            'cooperative_name' => Setting::getVal('cooperative_name', 'Ivisan Small Coconut Farmers Marketing Cooperative'),
            'cooperative_logo' => Setting::getVal('cooperative_logo') ? url('storage/' . Setting::getVal('cooperative_logo')) : null,
            'address' => Setting::getVal('address', 'Roxas City, Capiz, Philippines'),
            'contact_number' => Setting::getVal('contact_number', '+63 912 345 6789'),
            'email' => Setting::getVal('email', 'info@cascofamco.com'),
            'theme_mode' => Setting::getVal('theme_mode', 'cascofamco-green')
        ];

        return response()->json($settings);
    }

    /**
     * Update cooperative settings.
     */
    public function update(Request $request)
    {
        $request->validate([
            'cooperative_name' => 'sometimes|string|max:200',
            'address' => 'sometimes|string|max:255',
            'contact_number' => 'sometimes|string|max:50',
            'email' => 'sometimes|email|max:100',
            'theme_mode' => 'sometimes|string|max:50',
            'cooperative_logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048' // 2MB logo limit
        ]);

        if ($request->has('cooperative_name')) {
            Setting::setVal('cooperative_name', $request->cooperative_name);
        }
        if ($request->has('address')) {
            Setting::setVal('address', $request->address);
        }
        if ($request->has('contact_number')) {
            Setting::setVal('contact_number', $request->contact_number);
        }
        if ($request->has('email')) {
            Setting::setVal('email', $request->email);
        }
        if ($request->has('theme_mode')) {
            Setting::setVal('theme_mode', $request->theme_mode);
        }

        if ($request->hasFile('cooperative_logo')) {
            $oldLogo = Setting::getVal('cooperative_logo');
            if ($oldLogo) {
                Storage::disk('public')->delete($oldLogo);
            }
            $path = $request->file('cooperative_logo')->store('settings', 'public');
            Setting::setVal('cooperative_logo', $path);
        }

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => 'Updated System Settings Information.',
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Settings updated successfully',
            'cooperative_logo' => Setting::getVal('cooperative_logo') ? url('storage/' . Setting::getVal('cooperative_logo')) : null
        ]);
    }

    /**
     * Change logged-in user password.
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect'
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        // Log action
        ActivityLog::create([
            'user_id' => $user->id,
            'username' => $user->username,
            'action' => 'Changed password successfully.',
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Password changed successfully'
        ]);
    }

    /**
     * Backup the MySQL database using PHP.
     */
    public function backupDatabase(Request $request)
    {
        // Require Admin role
        if ($request->user()->role !== 'Administrator') {
            return response()->json(['message' => 'Unauthorized. Only Administrators can backup the database.'], 403);
        }

        try {
            $dbName = config('database.connections.mysql.database');
            $tables = DB::select('SHOW TABLES');
            $dbNameField = 'Tables_in_' . $dbName;
            
            $sqlScript = "-- CASCOFAMCO Database Backup\n";
            $sqlScript .= "-- Generated at: " . Carbon::now() . "\n";
            $sqlScript .= "-- Database: " . $dbName . "\n\n";
            $sqlScript .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

            foreach ($tables as $tableObj) {
                $tableName = $tableObj->$dbNameField;
                
                // Exclude personal access tokens and sessions if desired, but seeding is fine
                // SHOW CREATE TABLE
                $createResult = DB::select("SHOW CREATE TABLE `{$tableName}`");
                $createTableProp = 'Create Table';
                $createTableSql = $createResult[0]->$createTableProp;
                
                $sqlScript .= "DROP TABLE IF EXISTS `{$tableName}`;\n";
                $sqlScript .= $createTableSql . ";\n\n";
                
                // SELECT * FROM TABLE
                $rows = DB::select("SELECT * FROM `{$tableName}`");
                if (count($rows) > 0) {
                    $sqlScript .= "INSERT INTO `{$tableName}` VALUES \n";
                    $insertRows = [];
                    foreach ($rows as $row) {
                        $values = [];
                        foreach ((array)$row as $colVal) {
                            if (is_null($colVal)) {
                                $values[] = 'NULL';
                            } else {
                                $escapedVal = addslashes($colVal);
                                $escapedVal = str_replace("\n", "\\n", $escapedVal);
                                $escapedVal = str_replace("\r", "\\r", $escapedVal);
                                $values[] = "'{$escapedVal}'";
                            }
                        }
                        $insertRows[] = "(" . implode(', ', $values) . ")";
                    }
                    $sqlScript .= implode(",\n", $insertRows) . ";\n\n";
                }
            }

            $sqlScript .= "SET FOREIGN_KEY_CHECKS=1;\n";

            $filename = 'backup_' . Carbon::now()->format('Y_m_d_His') . '.sql';
            Storage::disk('public')->put('backups/' . $filename, $sqlScript);

            // Log action
            ActivityLog::create([
                'user_id' => $request->user()->id,
                'username' => $request->user()->username,
                'action' => "Generated system database backup: {$filename}",
                'ip_address' => $request->ip()
            ]);

            return response()->json([
                'message' => 'Database backup generated successfully.',
                'download_url' => url('storage/backups/' . $filename),
                'filename' => $filename
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Backup failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Restore the database from an uploaded SQL script.
     */
    public function restoreDatabase(Request $request)
    {
        // Require Admin role
        if ($request->user()->role !== 'Administrator') {
            return response()->json(['message' => 'Unauthorized. Only Administrators can restore the database.'], 403);
        }

        $request->validate([
            'backup_file' => 'required|file|mimetypes:text/plain,application/octet-stream,text/x-sql,application/sql'
        ]);

        try {
            $sqlContent = file_get_contents($request->file('backup_file')->getRealPath());
            
            if (empty($sqlContent)) {
                return response()->json(['message' => 'The uploaded file is empty.'], 400);
            }

            // Run DB restore
            DB::transaction(function() use ($sqlContent) {
                // Drop foreign constraints during restore
                DB::statement('SET FOREIGN_KEY_CHECKS=0');
                
                // Execute unbuffered raw SQL queries
                DB::unprepared($sqlContent);
                
                DB::statement('SET FOREIGN_KEY_CHECKS=1');
            });

            // Log action
            ActivityLog::create([
                'user_id' => $request->user()->id,
                'username' => $request->user()->username,
                'action' => 'Restored system database from backup file.',
                'ip_address' => $request->ip()
            ]);

            return response()->json([
                'message' => 'Database restored successfully.'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Restore failed: ' . $e->getMessage()
            ], 500);
        }
    }
}

<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Member;
use App\Models\Production;
use App\Models\Sale;
use App\Models\Task;
use App\Models\Setting;
use App\Models\ActivityLog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Administrator
        $admin = User::create([
            'username' => 'admin',
            'password' => Hash::make('admin123'),
            'role' => 'Administrator',
            'status' => 'Active',
            'email' => 'admin@cascofamco.com',
            'profile_picture' => null,
            'last_login' => Carbon::now()->subHours(2),
        ]);

        // 2. Create 10 Staff and 2 Auditor Users
        $staffNames = [
            'maria_clara', 'juan_delacruz', 'pedro_penduko', 'jose_rizal', 
            'andres_bonifacio', 'gregoria_dejesus', 'melchora_aquino', 
            'apolinario_mabini', 'marcelo_delpilar', 'antonio_luna'
        ];
        
        $users = [$admin];
        foreach ($staffNames as $index => $username) {
            $users[] = User::create([
                'username' => $username,
                'password' => Hash::make('staff123'),
                'role' => 'Staff',
                'status' => 'Active',
                'email' => $username . '@cascofamco.com',
                'profile_picture' => null,
                'last_login' => Carbon::now()->subDays(rand(1, 10)),
            ]);
        }

        $auditorNames = ['auditor1', 'auditor2'];
        foreach ($auditorNames as $username) {
            $users[] = User::create([
                'username' => $username,
                'password' => Hash::make('auditor123'),
                'role' => 'Auditor',
                'status' => 'Active',
                'email' => $username . '@cascofamco.com',
                'profile_picture' => null,
                'last_login' => Carbon::now()->subDays(rand(1, 5)),
            ]);
        }

        // 3. Create 100 Members
        $faker = \Faker\Factory::create();
        $genders = ['Male', 'Female', 'Other'];
        $statuses = ['Active', 'Active', 'Active', 'Inactive']; // Weighted towards Active
        
        $members = [];
        for ($i = 1; $i <= 100; $i++) {
            $gender = $faker->randomElement($genders);
            $firstName = ($gender === 'Female') ? $faker->firstNameFemale : $faker->firstNameMale;
            $lastName = $faker->lastName;
            
            // Format: MEM-YYYY-XXXX (e.g. MEM-2026-0001)
            $year = rand(2022, 2026);
            $code = sprintf("MEM-%d-%04d", $year, $i);
            
            $members[] = Member::create([
                'member_code' => $code,
                'firstname' => $firstName,
                'lastname' => $lastName,
                'gender' => $gender,
                'birthdate' => $faker->date('Y-m-d', '-20 years'),
                'address' => $faker->city . ', Capiz',
                'contact_number' => '09' . $faker->numerify('#########'),
                'email' => strtolower($firstName . '.' . $lastName) . '@gmail.com',
                'membership_date' => Carbon::create($year, rand(1, 12), rand(1, 28))->format('Y-m-d'),
                'status' => $faker->randomElement($statuses),
                'profile_picture' => null,
            ]);
        }

        // 4. Create 200 Production Records
        $productTypes = ['Copra', 'Whole Coconut', 'Coconut Husk', 'Charcoal', 'Coco Coir'];
        $sources = [
            'Pontevedra Farm', 'Panitan Farm', 'Sigma Farm', 'Roxas City Farm', 
            'Dao Farm', 'Mambusao Farm', 'Jamindan Farm', 'Dumalag Farm', 'Cuartero Farm'
        ];
        $prodStatuses = ['Completed', 'Completed', 'Completed', 'Approved', 'Pending', 'Cancelled'];

        for ($p = 1; $p <= 200; $p++) {
            $member = $faker->randomElement($members);
            $qty = $faker->randomFloat(2, 50, 1500); // 50kg to 1500kg
            $date = Carbon::now()->subDays(rand(1, 365))->format('Y-m-d');
            
            Production::create([
                'member_id' => $member->id,
                'product_type' => $faker->randomElement($productTypes),
                'quantity' => $qty,
                'unit' => 'kg',
                'source' => $faker->randomElement($sources),
                'remarks' => $faker->optional(0.3)->sentence,
                'production_date' => $date,
                'status' => $faker->randomElement($prodStatuses),
            ]);
        }

        // 5. Create 200 Sales Records
        $buyers = [
            'Franklin Baker Co.', 'Peter Paul Philippine Corp.', 'Capiz Agri-Products', 
            'Roxas Copra Traders', 'Minola Refining Corp.', 'Local Market Buyers'
        ];
        $salesProducts = ['Copra', 'Coconut Oil', 'Desiccated Coconut', 'Charcoal', 'Coir Fiber'];
        $payMethods = ['Cash', 'GCash', 'Bank Transfer', 'Check'];
        $salesStatuses = ['Paid', 'Paid', 'Paid', 'Pending', 'Cancelled'];

        for ($s = 1; $s <= 200; $s++) {
            $qty = $faker->randomFloat(2, 100, 5000);
            $unitPrice = $faker->randomFloat(2, 35, 95); // PHP 35 to 95 per kg
            $totalAmount = $qty * $unitPrice;
            $date = Carbon::now()->subDays(rand(1, 365))->format('Y-m-d');
            
            // Auto generated Invoice Number: INV-YYYY-XXXX
            $invoiceYear = Carbon::parse($date)->year;
            $invoiceNo = sprintf("INV-%d-%04d", $invoiceYear, $s);

            Sale::create([
                'invoice_no' => $invoiceNo,
                'buyer' => $faker->randomElement($buyers),
                'product' => $faker->randomElement($salesProducts),
                'quantity' => $qty,
                'unit' => 'kg',
                'unit_price' => $unitPrice,
                'total_amount' => $totalAmount,
                'payment_method' => $faker->randomElement($payMethods),
                'remarks' => $faker->optional(0.2)->sentence,
                'status' => $faker->randomElement($salesStatuses),
                'sale_date' => $date,
            ]);
        }

        // 6. Create 50 Tasks
        $taskTitles = [
            'Verify member documents', 'Inspect Pontevedra warehouse', 'Prepare monthly sales report',
            'Conduct auditor meeting', 'Check low stock copra levels', 'Update member status to active',
            'Process quarterly dividend payment', 'Prepare annual cooperative general assembly',
            'Deliver coconut husks to buyer', 'Record latest copra production batch',
            'Calibrate weighing scale at Dao station', 'Renew cooperative operating permit',
            'Conduct financial audit for Q2', 'Investigate pending invoice discrepancies',
            'Perform backup of database', 'Organize training for organic coconut farming',
            'Update price list in settings', 'Address member complaints regarding payment delay',
            'Maintain transport vehicle', 'Audit warehouse logs for charcoal production'
        ];
        $priorities = ['Low', 'Medium', 'High'];
        $taskStatuses = ['Pending', 'In Progress', 'Completed', 'Overdue'];

        for ($t = 1; $t <= 50; $t++) {
            $assignedUser = $faker->randomElement($users);
            $status = $faker->randomElement($taskStatuses);
            
            $progress = 0;
            if ($status === 'Completed') {
                $progress = 100;
            } elseif ($status === 'In Progress') {
                $progress = rand(10, 90);
            } elseif ($status === 'Overdue') {
                $progress = rand(0, 80);
            }
            
            $dueDate = ($status === 'Overdue') 
                ? Carbon::now()->subDays(rand(1, 30))->format('Y-m-d')
                : Carbon::now()->addDays(rand(1, 45))->format('Y-m-d');

            Task::create([
                'title' => $faker->randomElement($taskTitles),
                'description' => $faker->paragraph(2),
                'assigned_to' => $assignedUser->id,
                'priority' => $faker->randomElement($priorities),
                'status' => $status,
                'progress' => $progress,
                'due_date' => $dueDate,
            ]);
        }

        // 7. Create System Settings
        Setting::setVal('cooperative_name', 'Capiz Small Coconut Farmers Marketing Cooperative');
        Setting::setVal('cooperative_logo', null); // Use default asset in frontend
        Setting::setVal('address', 'Brgy. Tabuc, Pontevedra, Capiz, Philippines');
        Setting::setVal('contact_number', '+63 (036) 621-1234');
        Setting::setVal('email', 'cascofamco@gmail.com');
        Setting::setVal('theme_mode', 'light');

        // 8. Create Activity Logs
        ActivityLog::create([
            'user_id' => $admin->id,
            'username' => $admin->username,
            'action' => 'System initialized and seeded database successfully.',
            'ip_address' => '127.0.0.1'
        ]);

        ActivityLog::create([
            'user_id' => $admin->id,
            'username' => $admin->username,
            'action' => 'Settings configured to Capiz Small Coconut Farmers Marketing Cooperative.',
            'ip_address' => '127.0.0.1'
        ]);

        for ($l = 0; $l < 10; $l++) {
            $user = $faker->randomElement($users);
            ActivityLog::create([
                'user_id' => $user->id,
                'username' => $user->username,
                'action' => $faker->randomElement([
                    'Logged in.',
                    'Viewed Member List.',
                    'Updated a member profile.',
                    'Recorded new production record.',
                    'Generated Sales report.',
                    'Created a cooperative task.'
                ]),
                'ip_address' => $faker->ipv4,
                'created_at' => Carbon::now()->subMinutes(rand(5, 500)),
            ]);
        }
    }
}

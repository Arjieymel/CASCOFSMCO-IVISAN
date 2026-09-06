<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SettingControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed some settings
        Setting::setVal('cooperative_name', 'Test Cooperative');
        Setting::setVal('address', 'Test Address');
        Setting::setVal('contact_number', '123456');
        Setting::setVal('email', 'test@test.com');
        Setting::setVal('theme_mode', 'light');
    }

    public function test_get_settings_is_public(): void
    {
        $response = $this->getJson('/api/settings');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'cooperative_name',
                'cooperative_logo',
                'address',
                'contact_number',
                'email',
                'theme_mode',
            ])
            ->assertJson([
                'cooperative_name' => 'Test Cooperative',
            ]);
    }

    public function test_update_settings_requires_authentication(): void
    {
        $response = $this->postJson('/api/settings', [
            'cooperative_name' => 'New Name',
            'address' => 'New Address',
            'contact_number' => '654321',
            'email' => 'new@test.com',
            'theme_mode' => 'dark',
        ]);

        $response->assertStatus(401);
    }

    public function test_update_settings_successful_with_authentication(): void
    {
        $user = User::create([
            'username' => 'testuser',
            'password' => bcrypt('password123'),
            'role' => 'Administrator',
        ]);

        $response = $this->actingAs($user)
            ->postJson('/api/settings', [
                'cooperative_name' => 'Updated Cooperative',
                'address' => 'New Address',
                'contact_number' => '654321',
                'email' => 'new@test.com',
                'theme_mode' => 'dark',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Settings updated successfully',
            ]);

        $this->assertEquals('Updated Cooperative', Setting::getVal('cooperative_name'));
        $this->assertEquals('dark', Setting::getVal('theme_mode'));
    }

    public function test_update_settings_with_logo_upload(): void
    {
        Storage::fake('public');

        $user = User::create([
            'username' => 'testuser',
            'password' => bcrypt('password123'),
            'role' => 'Administrator',
        ]);

        $file = UploadedFile::fake()->image('coop_logo.png');

        $response = $this->actingAs($user)
            ->postJson('/api/settings', [
                'cooperative_name' => 'Updated Cooperative',
                'address' => 'New Address',
                'contact_number' => '654321',
                'email' => 'new@test.com',
                'theme_mode' => 'dark',
                'cooperative_logo' => $file,
            ]);

        $response->assertStatus(200);

        // Verify file stored in fake storage
        $storedLogoPath = Setting::getVal('cooperative_logo');
        $this->assertNotNull($storedLogoPath);
        Storage::disk('public')->assertExists($storedLogoPath);
    }
}

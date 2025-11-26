<?php

namespace Database\Seeders;

use App\Models\Institution;
use Illuminate\Database\Seeder;

class InstitutionSeeder extends Seeder
{
    public function run(): void
    {
        Institution::create([
            'name' => 'Central Office',
            'code' => 'CENTRAL',
            'level' => 'central',
            'is_active' => true,
        ]);
    }
}

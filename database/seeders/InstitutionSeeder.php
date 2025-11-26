<?php

namespace Database\Seeders;

use App\Models\Institution;
use Illuminate\Database\Seeder;

class InstitutionSeeder extends Seeder
{
    public function run(): void
    {
        Institution::updateOrCreate(
            ['code' => 'CENTRAL'],
            [
                'name' => 'Central Office',
                'level' => 'central',
                'is_active' => true,
            ]
        );
    }
}

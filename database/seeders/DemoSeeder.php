<?php

namespace Database\Seeders;

use App\Models\Institution;
use App\Models\Questionnaire;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        // First run the base seeders
        $this->call([
            RoleAndPermissionSeeder::class,
            InstitutionSeeder::class,
            UserSeeder::class,
        ]);

        $centralInstitution = Institution::where('code', 'CENTRAL')->first();
        $admin = User::where('email', 'admin@example.com')->first();

        // Create additional institutions
        $province1 = Institution::create([
            'name' => 'Province A',
            'code' => 'PROV-A',
            'level' => 'province',
            'parent_institution_id' => $centralInstitution->id,
            'is_active' => true,
            'created_by' => $admin->id,
        ]);

        $province2 = Institution::create([
            'name' => 'Province B',
            'code' => 'PROV-B',
            'level' => 'province',
            'parent_institution_id' => $centralInstitution->id,
            'is_active' => true,
            'created_by' => $admin->id,
        ]);

        // Create sample users
        $enumerator1 = User::create([
            'name' => 'John Enumerator',
            'email' => 'enumerator1@example.com',
            'password' => Hash::make('password'),
            'institution_id' => $province1->id,
            'is_active' => true,
            'created_by' => $admin->id,
        ]);
        $enumerator1->assignRole('enumerator');

        $enumerator2 = User::create([
            'name' => 'Jane Enumerator',
            'email' => 'enumerator2@example.com',
            'password' => Hash::make('password'),
            'institution_id' => $province2->id,
            'is_active' => true,
            'created_by' => $admin->id,
        ]);
        $enumerator2->assignRole('enumerator');

        $viewer1 = User::create([
            'name' => 'Bob Viewer',
            'email' => 'viewer1@example.com',
            'password' => Hash::make('password'),
            'institution_id' => $province1->id,
            'is_active' => true,
            'created_by' => $admin->id,
        ]);
        $viewer1->assignRole('viewer');

        $viewer2 = User::create([
            'name' => 'Alice Viewer',
            'email' => 'viewer2@example.com',
            'password' => Hash::make('password'),
            'institution_id' => $province2->id,
            'is_active' => true,
            'created_by' => $admin->id,
        ]);
        $viewer2->assignRole('viewer');

        // Create sample questionnaires
        $questionnaire1 = Questionnaire::create([
            'code' => 'HEALTH-SURVEY',
            'version' => 1,
            'title' => 'Health Facility Survey',
            'description' => 'A comprehensive survey for health facility assessment',
            'surveyjs_json' => [
                'title' => 'Health Facility Survey',
                'pages' => [
                    [
                        'name' => 'page1',
                        'title' => 'Basic Information',
                        'elements' => [
                            [
                                'type' => 'text',
                                'name' => 'facility_name',
                                'title' => 'Facility Name',
                                'isRequired' => true,
                            ],
                            [
                                'type' => 'dropdown',
                                'name' => 'facility_type',
                                'title' => 'Facility Type',
                                'isRequired' => true,
                                'choices' => ['Hospital', 'Health Center', 'Clinic', 'Pharmacy'],
                            ],
                            [
                                'type' => 'text',
                                'name' => 'staff_count',
                                'title' => 'Number of Staff',
                                'inputType' => 'number',
                            ],
                        ],
                    ],
                ],
            ],
            'is_active' => true,
            'created_by' => $admin->id,
        ]);

        $questionnaire2 = Questionnaire::create([
            'code' => 'EDUCATION-SURVEY',
            'version' => 1,
            'title' => 'Education Assessment Survey',
            'description' => 'Survey for assessing educational institutions',
            'surveyjs_json' => [
                'title' => 'Education Assessment Survey',
                'pages' => [
                    [
                        'name' => 'page1',
                        'title' => 'School Information',
                        'elements' => [
                            [
                                'type' => 'text',
                                'name' => 'school_name',
                                'title' => 'School Name',
                                'isRequired' => true,
                            ],
                            [
                                'type' => 'dropdown',
                                'name' => 'school_level',
                                'title' => 'School Level',
                                'isRequired' => true,
                                'choices' => ['Primary', 'Secondary', 'High School', 'University'],
                            ],
                            [
                                'type' => 'text',
                                'name' => 'student_count',
                                'title' => 'Number of Students',
                                'inputType' => 'number',
                            ],
                            [
                                'type' => 'text',
                                'name' => 'teacher_count',
                                'title' => 'Number of Teachers',
                                'inputType' => 'number',
                            ],
                        ],
                    ],
                ],
            ],
            'is_active' => true,
            'created_by' => $admin->id,
        ]);

        // Create sample submissions
        // Draft submissions
        Submission::create([
            'questionnaire_id' => $questionnaire1->id,
            'institution_id' => $province1->id,
            'status' => 'draft',
            'answers_json' => ['facility_name' => 'City Hospital'],
            'created_by' => $enumerator1->id,
        ]);

        Submission::create([
            'questionnaire_id' => $questionnaire2->id,
            'institution_id' => $province1->id,
            'status' => 'draft',
            'answers_json' => ['school_name' => 'Central Primary School'],
            'created_by' => $enumerator1->id,
        ]);

        // Submitted submissions
        Submission::create([
            'questionnaire_id' => $questionnaire1->id,
            'institution_id' => $province1->id,
            'status' => 'submitted',
            'answers_json' => [
                'facility_name' => 'District Health Center',
                'facility_type' => 'Health Center',
                'staff_count' => '25',
            ],
            'submitted_at' => now()->subDays(3),
            'created_by' => $enumerator1->id,
        ]);

        Submission::create([
            'questionnaire_id' => $questionnaire1->id,
            'institution_id' => $province2->id,
            'status' => 'submitted',
            'answers_json' => [
                'facility_name' => 'Regional Hospital',
                'facility_type' => 'Hospital',
                'staff_count' => '150',
            ],
            'submitted_at' => now()->subDays(2),
            'created_by' => $enumerator2->id,
        ]);

        // Approved submissions
        for ($i = 1; $i <= 5; $i++) {
            Submission::create([
                'questionnaire_id' => $questionnaire1->id,
                'institution_id' => $i % 2 === 0 ? $province1->id : $province2->id,
                'status' => 'approved',
                'answers_json' => [
                    'facility_name' => "Health Facility {$i}",
                    'facility_type' => $i % 2 === 0 ? 'Hospital' : 'Clinic',
                    'staff_count' => (string) ($i * 10),
                ],
                'submitted_at' => now()->subDays(10 + $i),
                'approved_at' => now()->subDays(5 + $i),
                'approved_by' => $admin->id,
                'created_by' => $i % 2 === 0 ? $enumerator1->id : $enumerator2->id,
            ]);
        }

        // Rejected submissions
        Submission::create([
            'questionnaire_id' => $questionnaire2->id,
            'institution_id' => $province1->id,
            'status' => 'rejected',
            'answers_json' => [
                'school_name' => 'Test School',
                'school_level' => 'Primary',
            ],
            'submitted_at' => now()->subDays(5),
            'rejected_at' => now()->subDays(4),
            'rejected_by' => $admin->id,
            'rejection_comments' => 'Please provide the number of students and teachers.',
            'created_by' => $enumerator1->id,
        ]);

        Submission::create([
            'questionnaire_id' => $questionnaire2->id,
            'institution_id' => $province2->id,
            'status' => 'rejected',
            'answers_json' => [
                'school_name' => 'Another School',
            ],
            'submitted_at' => now()->subDays(6),
            'rejected_at' => now()->subDays(5),
            'rejected_by' => $admin->id,
            'rejection_comments' => 'Incomplete data. Please fill all required fields.',
            'created_by' => $enumerator2->id,
        ]);
    }
}

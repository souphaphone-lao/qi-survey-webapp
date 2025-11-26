<?php

namespace App\Providers;

use App\Models\Institution;
use App\Models\Questionnaire;
use App\Models\Submission;
use App\Models\User;
use App\Policies\InstitutionPolicy;
use App\Policies\QuestionnairePolicy;
use App\Policies\SubmissionPolicy;
use App\Policies\UserPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Register policies
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Institution::class, InstitutionPolicy::class);
        Gate::policy(Questionnaire::class, QuestionnairePolicy::class);
        Gate::policy(Submission::class, SubmissionPolicy::class);

        // Set default password validation rules
        Password::defaults(function () {
            return Password::min(8)
                ->mixedCase()
                ->numbers();
        });
    }
}

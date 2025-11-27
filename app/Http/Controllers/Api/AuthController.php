<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Check if user is locked
        if ($user->isLocked()) {
            throw ValidationException::withMessages([
                'email' => ['Account is temporarily locked. Please try again later.'],
            ]);
        }

        // Check if user is active
        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Your account has been deactivated.'],
            ]);
        }

        // Verify password
        if (!Hash::check($request->password, $user->password)) {
            $user->incrementFailedLoginAttempts();

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Reset failed login attempts and update last login
        $user->resetFailedLoginAttempts();

        // Create token
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'institution_id' => $user->institution_id,
                'institution' => $user->institution,
                'locale' => $user->locale ?? 'en',
                'roles' => $user->getRoleNames()->toArray(),
                'permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
            ],
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Successfully logged out']);
    }

    public function user(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('institution');

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'institution_id' => $user->institution_id,
            'institution' => $user->institution,
            'locale' => $user->locale ?? 'en',
            'roles' => $user->getRoleNames()->toArray(),
            'permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
        ]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $request->validate([
            'locale' => 'required|string|in:en,lo',
        ]);

        $user = $request->user();
        $user->update(['locale' => $request->locale]);

        return response()->json([
            'message' => 'Preferences updated successfully',
            'locale' => $user->locale,
        ]);
    }
}

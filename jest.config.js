export default {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/resources/js'],
    testMatch: ['**/__tests__/**/*.{ts,tsx}', '**/*.{spec,test}.{ts,tsx}'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            useESM: true,
        }],
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/resources/js/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    },
    setupFilesAfterEnv: ['<rootDir>/resources/js/setupTests.ts'],
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    collectCoverageFrom: [
        'resources/js/**/*.{ts,tsx}',
        '!resources/js/**/*.d.ts',
        '!resources/js/app.tsx',
    ],
};

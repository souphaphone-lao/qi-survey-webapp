import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enQuestionnaires from './locales/en/questionnaires.json';
import enSubmissions from './locales/en/submissions.json';
import enUsers from './locales/en/users.json';
import enInstitutions from './locales/en/institutions.json';
import enDepartments from './locales/en/departments.json';

import loCommon from './locales/lo/common.json';
import loAuth from './locales/lo/auth.json';
import loDashboard from './locales/lo/dashboard.json';
import loQuestionnaires from './locales/lo/questionnaires.json';
import loSubmissions from './locales/lo/submissions.json';
import loUsers from './locales/lo/users.json';
import loInstitutions from './locales/lo/institutions.json';
import loDepartments from './locales/lo/departments.json';

// Translation resources
const resources = {
    en: {
        common: enCommon,
        auth: enAuth,
        dashboard: enDashboard,
        questionnaires: enQuestionnaires,
        submissions: enSubmissions,
        users: enUsers,
        institutions: enInstitutions,
        departments: enDepartments,
    },
    lo: {
        common: loCommon,
        auth: loAuth,
        dashboard: loDashboard,
        questionnaires: loQuestionnaires,
        submissions: loSubmissions,
        users: loUsers,
        institutions: loInstitutions,
        departments: loDepartments,
    },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        defaultNS: 'common',
        ns: ['common', 'auth', 'dashboard', 'questionnaires', 'submissions', 'users', 'institutions', 'departments'],

        interpolation: {
            escapeValue: false, // React already escapes
        },

        detection: {
            // Order of detection
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },

        react: {
            useSuspense: true,
        },
    });

export default i18n;

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

interface Language {
    code: string;
    name: string;
    nativeName: string;
}

const languages: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
];

export const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageChange = async (languageCode: string) => {
        try {
            // Change language in i18next
            await i18n.changeLanguage(languageCode);

            // Save to localStorage
            localStorage.setItem('locale', languageCode);

            // Update user preference in backend if user is logged in
            if (user) {
                try {
                    await api.put('/user/preferences', { locale: languageCode });
                } catch (error) {
                    console.error('Failed to update user locale preference:', error);
                    // Non-blocking error - language still changed locally
                }
            }

            setIsOpen(false);
        } catch (error) {
            console.error('Failed to change language:', error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <svg
                    className="h-5 w-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                    />
                </svg>
                <span>{currentLanguage.nativeName}</span>
                <svg
                    className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {languages.map((language) => (
                        <button
                            key={language.code}
                            onClick={() => handleLanguageChange(language.code)}
                            className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                                currentLanguage.code === language.code
                                    ? 'bg-gray-50 font-medium text-indigo-600'
                                    : 'text-gray-700'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span>{language.nativeName}</span>
                                {currentLanguage.code === language.code && (
                                    <svg
                                        className="h-4 w-4 text-indigo-600"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                )}
                            </div>
                            <span className="text-xs text-gray-500">{language.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

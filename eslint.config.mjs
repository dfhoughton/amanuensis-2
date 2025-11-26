import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import reactCompilerPlugin from 'eslint-plugin-react-compiler'

export default tseslint.config(
    // Ignore patterns
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            '_site/**',
            '.jekyll-cache/**',
            'build/**',
            '*.config.js',
            '*.config.mjs',
        ],
    },

    // Base JavaScript recommended rules
    js.configs.recommended,

    // TypeScript configuration
    ...tseslint.configs.recommended,

    // React and React Hooks configuration
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            'react-compiler': reactCompilerPlugin,
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                console: 'readonly',

                // Chrome extension globals
                chrome: 'readonly',

                // Node/build globals
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
            },
        },
        settings: {
            react: {
                version: '19.0',
            },
        },
        rules: {
            // React rules
            ...reactPlugin.configs.recommended.rules,
            ...reactPlugin.configs['jsx-runtime'].rules,

            // React Hooks rules
            ...reactHooksPlugin.configs.recommended.rules,

            // React Compiler rules - enforces patterns compatible with React Compiler
            'react-compiler/react-compiler': 'error',

            // TypeScript-specific adjustments
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],

            // General code quality
            'no-console': 'off', // Allow console in extension development
            'prefer-const': 'warn',
        },
    }
)

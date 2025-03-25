// eslint.config.js
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import securityPlugin from 'eslint-plugin-security';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import nodePlugin from 'eslint-plugin-node';
import promisePlugin from 'eslint-plugin-promise';

export default tseslint.config(
    {
        files: ['**/*.ts'],
        extends: [
            tseslint.configs.recommended
        ],
        plugins: {
            import: importPlugin,
            security: securityPlugin,
            sonarjs: sonarjsPlugin,
            node: nodePlugin,
            promise: promisePlugin
        },
        ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
        rules: {
            '@typescript-eslint/interface-name-prefix': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',

            // import rules
            'import/order': ['error', {
                'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                'newlines-between': 'always',
                'alphabetize': { 'order': 'asc', 'caseInsensitive': true }
            }],

            // sonarjs rules
            'sonarjs/cognitive-complexity': ['error', 15],
            'sonarjs/no-duplicate-string': ['error', { 'threshold': 3 }],

            // promise rules
            'promise/always-return': 'error',
            'promise/no-callback-in-promise': 'warn',

            // node rules
            'node/no-missing-import': 'off'
        },
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
            },
        },
    }
);
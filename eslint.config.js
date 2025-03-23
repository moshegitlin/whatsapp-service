import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        files: ['**/*.ts'],
        extends: [
            tseslint.configs.recommended,
        ],
        ignores: ['**/node_modules/**', '**/dist/**'],
        rules: {
            '@typescript-eslint/interface-name-prefix': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
        },
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
            },
        },
    }
);
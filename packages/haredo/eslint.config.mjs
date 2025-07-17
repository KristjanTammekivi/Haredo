import { defineConfig } from 'eslint/config';
import eslintConfigHein from 'eslint-config-hein';

export default defineConfig([
    ...eslintConfigHein,
    {
        files: ['**/*.ts'],
        rules: {
            'unicorn/prevent-abbreviations': 'off',
            'unicorn/prefer-add-event-listener': 'off',
            'mocha/no-top-level-hooks': 'off',
            '@typescript-eslint/no-extra-parens': 'off',
            'mocha/no-sibling-hooks': 'off',
            'unicorn/prefer-event-target': 'off'
        }
    }
]);

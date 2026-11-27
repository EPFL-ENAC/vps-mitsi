import js from '@eslint/js';
import vueI18n from '@intlify/eslint-plugin-vue-i18n';
import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';

export default defineConfigWithVueTs(
    { ignores: ['dist/', '.quasar/', 'quasar.config.*.temporary.compiled*'] },

    js.configs.recommended,
    pluginVue.configs['flat/recommended'],
    // https://github.com/vuejs/eslint-config-typescript
    vueTsConfigs.recommendedTypeChecked,

    {
        files: ['src/**/*.vue'],
        plugins: { '@intlify/vue-i18n': vueI18n },
        rules: {
            '@intlify/vue-i18n/no-raw-text': [
                'error',
                {
                    attributes: {
                        '/.+/': ['alt', 'aria-label', 'label', 'placeholder', 'title'],
                    },
                    ignorePattern: '^[\\s\\p{P}+]*$',
                },
            ],
        },
    },

    {
        files: ['**/*.ts', '**/*.vue'],
        rules: {
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
        },
    },

    {
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
        rules: {
            'prefer-promise-reject-errors': 'off',
            // allow debugger during development only
            'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        },
    },

    { files: ['src/**'], languageOptions: { globals: globals.browser } },
    {
        files: ['tests/**', 'quasar.config.ts', 'eslint.config.js'],
        languageOptions: { globals: globals.node },
    },

    prettier,
);

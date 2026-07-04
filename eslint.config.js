// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
// Désactive les règles stylistiques d'ESLint : le formatage est du ressort de Biome
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
    expoConfig,
    prettierConfig,
    {
        ignores: ['dist/*', 'supabase/functions/*'],
    },
]);

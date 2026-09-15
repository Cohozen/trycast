// metro.config.js
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Le barème est un module canonique partagé avec les Edge Functions
// (src/features/scoring/*.ts le réexporte). Il vit hors du projet Expo : sans
// workspaces npm, Metro ne surveille que apps/mobile et refuserait le fichier.
config.watchFolders = [path.resolve(__dirname, '../../supabase/functions/_shared')];

module.exports = withNativewind(config, {
    // inline variables break PlatformColor in CSS variables
    inlineVariables: false,
    // We add className support manually via src/tw wrappers
    globalClassNamePolyfill: false,
});

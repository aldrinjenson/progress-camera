// Config plugin: sign release builds with our own key when it's provided.
// Set PROGRESS_CAMERA_STORE_FILE (absolute path), PROGRESS_CAMERA_STORE_PASSWORD,
// PROGRESS_CAMERA_KEY_ALIAS and PROGRESS_CAMERA_KEY_PASSWORD as env vars (CI secrets
// or ~/personal/progress-camera-keys/keystore.env locally). Without them, release
// falls back to the debug key so local builds still work.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_CONFIG = `
        release {
            def storePath = System.getenv('PROGRESS_CAMERA_STORE_FILE')
            if (storePath) {
                storeFile file(storePath)
                storePassword System.getenv('PROGRESS_CAMERA_STORE_PASSWORD')
                keyAlias System.getenv('PROGRESS_CAMERA_KEY_ALIAS')
                keyPassword System.getenv('PROGRESS_CAMERA_KEY_PASSWORD')
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes('PROGRESS_CAMERA_STORE_FILE')) return cfg;
    // add a release signing config after the debug one
    g = g.replace(/(signingConfigs \{\s*debug \{[^}]*\})/, `$1${RELEASE_CONFIG}`);
    // release build type: use it when the key is present
    g = g.replace(
      /(release \{\s*\/\/ Caution![^\n]*\n[^\n]*\n\s*)signingConfig signingConfigs\.debug/,
      `$1signingConfig System.getenv('PROGRESS_CAMERA_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`
    );
    cfg.modResults.contents = g;
    return cfg;
  });
};

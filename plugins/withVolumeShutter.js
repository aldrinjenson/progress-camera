// Config plugin: turns the volume keys into a shutter.
// Patches MainActivity to swallow volume key presses and emit a "volumeShutter"
// event to JS. The app plays no audio, so taking over the keys costs nothing.
const { withMainActivity } = require('expo/config-plugins');

const IMPORTS = [
  'import android.view.KeyEvent',
  'import com.facebook.react.ReactApplication',
  'import com.facebook.react.modules.core.DeviceEventManagerModule',
];

const METHOD = `
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    val code = event.keyCode
    if (code == KeyEvent.KEYCODE_VOLUME_UP || code == KeyEvent.KEYCODE_VOLUME_DOWN) {
      if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
        (application as ReactApplication).reactHost?.currentReactContext
          ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          ?.emit("volumeShutter", null)
      }
      return true
    }
    return super.dispatchKeyEvent(event)
  }
`;

module.exports = function withVolumeShutter(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes('volumeShutter')) return cfg;
    for (const imp of IMPORTS) {
      if (!src.includes(imp)) src = src.replace(/^(package .*\n)/m, `$1\n${imp}`);
    }
    src = src.replace(/\n}\s*$/, `\n${METHOD}}\n`);
    cfg.modResults.contents = src;
    return cfg;
  });
};

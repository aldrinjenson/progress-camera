#!/usr/bin/env bash
# Local signed release build. Key lives outside the repo in ../progress-camera-keys/.
set -euo pipefail
cd "$(dirname "$0")/.."
KEYS="$(cd .. && pwd)/progress-camera-keys"
set -a; source "$KEYS/keystore.env"; set +a
export PROGRESS_CAMERA_STORE_FILE="$KEYS/release.keystore"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"
npx expo prebuild --platform android --clean
(cd android && ./gradlew assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a)
cp android/app/build/outputs/apk/release/app-release.apk progress-camera.apk
echo "Built progress-camera.apk"

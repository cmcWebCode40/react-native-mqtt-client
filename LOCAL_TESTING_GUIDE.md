# Local Testing Guide

Test `@ecodevstack/react-native-mqtt-client` locally before publishing to npm using [yalc](https://github.com/wclr/yalc).

## Prerequisites

```bash
npm install -g yalc
```

## 1. Publish Locally

From the library root directory:

```bash
cd /path/to/react-native-mqtt-client
yalc publish
```

This runs the `prepare` script (builds JS + plugin) and stores the package in your local yalc store (`~/.yalc`).

## 2. Install in Your Project

In your React Native / Expo app:

```bash
cd /path/to/your-app
yalc add @ecodevstack/react-native-mqtt-client
```

Then install dependencies and rebuild:

```bash
# Install deps
yarn install  # or npm install

# For Expo projects
npx expo prebuild --clean
npx expo run:ios
# or
npx expo run:android

# For bare React Native projects
cd ios && pod install && cd ..
npx react-native run-ios
```

## 3. Push Updates

When you make changes to the library and want to test again:

```bash
# In the library directory
cd /path/to/react-native-mqtt-client
yalc publish --push
```

The `--push` flag automatically updates all projects that have added this package. Then rebuild your app:

```bash
# In your app directory
npx expo prebuild --clean && npx expo run:ios
```

## 4. Remove After Testing

When you're done testing, clean up in your app project:

```bash
cd /path/to/your-app
yalc remove @ecodevstack/react-native-mqtt-client
yarn install  # or npm install (restores original state)
```

To remove all yalc packages at once:

```bash
yalc remove --all
```

## Notes

- `yalc publish` respects the `"files"` field in `package.json`, so the local package mirrors what npm would contain.
- Yalc modifies your app's `package.json` temporarily — don't commit the yalc changes (`yalc.lock`, `.yalc/`). Add them to `.gitignore`:

```gitignore
.yalc/
yalc.lock
```

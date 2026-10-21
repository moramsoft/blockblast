import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

// Paths
const PKG_PATH = path.join(ROOT_DIR, 'package.json');
const PKG_LOCK_PATH = path.join(ROOT_DIR, 'package-lock.json');
const VERSION_TS_PATH = path.join(ROOT_DIR, 'src/version.ts');
const INDEX_HTML_PATH = path.join(ROOT_DIR, 'index.html');
const ANDROID_GRADLE_PATH = path.join(ROOT_DIR, 'android/app/build.gradle');
const IOS_PBXPROJ_PATH = path.join(ROOT_DIR, 'ios/App/App.xcodeproj/project.pbxproj');

// 1. Read current version from package.json
const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'));
const currentVersion = pkg.version || '1.0.0';
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Determine new version
const arg = process.argv[2] || 'patch';
let newVersion = '';

if (arg === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (arg === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else if (arg === 'patch') {
  newVersion = `${major}.${minor}.${patch + 1}`;
} else if (/^\d+\.\d+\.\d+$/.test(arg)) {
  newVersion = arg;
} else {
  console.error(`Invalid argument: ${arg}. Usage: node scripts/bump-version.mjs [patch|minor|major|x.y.z]`);
  process.exit(1);
}

console.log(`\n📦 Bumping Brain Bloom: v${currentVersion} -> v${newVersion}\n`);

// 2. Update package.json
pkg.version = newVersion;
fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
console.log(`  ✓ Updated package.json (version: ${newVersion})`);

// 3. Update package-lock.json if exists
if (fs.existsSync(PKG_LOCK_PATH)) {
  const pkgLock = JSON.parse(fs.readFileSync(PKG_LOCK_PATH, 'utf-8'));
  pkgLock.version = newVersion;
  if (pkgLock.packages && pkgLock.packages['']) {
    pkgLock.packages[''].version = newVersion;
  }
  fs.writeFileSync(PKG_LOCK_PATH, JSON.stringify(pkgLock, null, 2) + '\n');
  console.log(`  ✓ Updated package-lock.json`);
}

// 4. Update src/version.ts
const versionTsContent = `export const APP_VERSION = 'v${newVersion}';\n`;
fs.writeFileSync(VERSION_TS_PATH, versionTsContent);
console.log(`  ✓ Updated src/version.ts (APP_VERSION = 'v${newVersion}')`);

// 5. Update index.html
if (fs.existsSync(INDEX_HTML_PATH)) {
  let html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
  html = html.replace(
    /<div id="titleVersionBadge" class="title-version-badge">v[^<]+<\/div>/,
    `<div id="titleVersionBadge" class="title-version-badge">v${newVersion}</div>`
  );
  fs.writeFileSync(INDEX_HTML_PATH, html);
  console.log(`  ✓ Updated index.html (#titleVersionBadge -> v${newVersion})`);
}

// 6. Update android/app/build.gradle (versionCode & versionName)
let newAndroidVersionCode = 1;
if (fs.existsSync(ANDROID_GRADLE_PATH)) {
  let gradle = fs.readFileSync(ANDROID_GRADLE_PATH, 'utf-8');
  const codeMatch = gradle.match(/versionCode\s+(\d+)/);
  if (codeMatch) {
    const currentCode = parseInt(codeMatch[1], 10);
    newAndroidVersionCode = currentCode + 1;
    gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${newAndroidVersionCode}`);
  }
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${newVersion}"`);
  fs.writeFileSync(ANDROID_GRADLE_PATH, gradle);
  console.log(`  ✓ Updated android/app/build.gradle (versionCode: ${newAndroidVersionCode}, versionName: "${newVersion}")`);
}

// 7. Update ios/App/App.xcodeproj/project.pbxproj (CURRENT_PROJECT_VERSION & MARKETING_VERSION)
if (fs.existsSync(IOS_PBXPROJ_PATH)) {
  let pbx = fs.readFileSync(IOS_PBXPROJ_PATH, 'utf-8');
  pbx = pbx.replace(/CURRENT_PROJECT_VERSION\s*=\s*\d+;/g, `CURRENT_PROJECT_VERSION = ${newAndroidVersionCode};`);
  pbx = pbx.replace(/MARKETING_VERSION\s*=\s*[^;]+;/g, `MARKETING_VERSION = ${newVersion};`);
  fs.writeFileSync(IOS_PBXPROJ_PATH, pbx);
  console.log(`  ✓ Updated iOS project.pbxproj (CURRENT_PROJECT_VERSION: ${newAndroidVersionCode}, MARKETING_VERSION: ${newVersion})`);
}

console.log(`\n🎉 Successfully bumped version to v${newVersion} (Build / versionCode: ${newAndroidVersionCode})\n`);

import fs from 'fs';
import path from 'path';

const manifestPath = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
  console.error(`AndroidManifest.xml not found at ${manifestPath}`);
  process.exit(1);
}

let manifest = fs.readFileSync(manifestPath, 'utf8');

const permissions = [
  'android.permission.VIBRATE',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.USE_EXACT_ALARM'
];

let updated = false;

permissions.forEach(permission => {
  const permString = `<uses-permission android:name="${permission}" />`;
  if (!manifest.includes(permission)) {
    // Insert the permission right after the opening <manifest ...> tag
    manifest = manifest.replace(/(<manifest[^>]*>)/, `$1\n    ${permString}`);
    console.log(`Added permission: ${permission}`);
    updated = true;
  } else {
    console.log(`Permission already exists: ${permission}`);
  }
});

if (updated) {
  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('AndroidManifest.xml successfully patched.');
} else {
  console.log('No manifest changes needed.');
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

if (!fs.existsSync(gradlePath)) {
  console.error('build.gradle not found at', gradlePath);
  process.exit(1);
}

let content = fs.readFileSync(gradlePath, 'utf8');

if (!content.includes('signingConfigs {')) {
  const signingConfig = `
    signingConfigs {
        release {
            storeFile file('prompt-claude.keystore')
            storePassword 'password'
            keyAlias 'promptclaude'
            keyPassword 'password'
        }
    }
`;
  content = content.replace(/buildTypes\s*\{/, signingConfig + '\n    buildTypes {');
}

if (!content.includes('signingConfig signingConfigs.release')) {
  content = content.replace(/buildTypes\s*\{/, "buildTypes {\n        debug {\n            signingConfig signingConfigs.release\n        }");
  content = content.replace(/buildTypes\s*\{\s*debug\s*\{\s*signingConfig signingConfigs\.release\s*\}\s*release\s*\{/, "buildTypes {\n        debug {\n            signingConfig signingConfigs.release\n        }\n        release {\n            signingConfig signingConfigs.release");
}

fs.writeFileSync(gradlePath, content);
console.log('Successfully patched build.gradle with signing config.');

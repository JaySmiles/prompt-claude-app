import forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate a key pair
console.log('Generating key pair...');
const keys = forge.pki.rsa.generateKeyPair(2048);

// Create a certificate
console.log('Creating certificate...');
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 25);

const attrs = [{
  name: 'commonName',
  value: 'Prompt Claude'
}, {
  name: 'countryName',
  value: 'US'
}, {
  shortName: 'ST',
  value: 'State'
}, {
  name: 'localityName',
  value: 'City'
}, {
  name: 'organizationName',
  value: 'JaySmiles'
}, {
  shortName: 'OU',
  value: 'App'
}];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Self-sign the certificate
cert.sign(keys.privateKey, forge.md.sha256.create());

// Create PKCS#12
console.log('Creating PKCS#12 keystore...');
const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
  keys.privateKey, [cert], 'password',
  { generateLocalKeyId: true, friendlyName: 'promptclaude' }
);
const p12Der = forge.asn1.toDer(p12Asn1).getBytes();

const outputDir = path.join(__dirname, '..', 'resources', 'android');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'prompt-claude.keystore');
fs.writeFileSync(outputPath, p12Der, 'binary');
console.log(`Keystore generated at: ${outputPath}`);

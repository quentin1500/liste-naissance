const crypto = require('node:crypto');
const readline = require('node:readline');
const { Writable } = require('node:stream');

if (!process.stdin.isTTY) {
  console.error('Exécutez ce programme dans un terminal interactif.');
  process.exit(1);
}
const output = new Writable({ write(chunk, encoding, callback) { callback(); } });
const prompt = readline.createInterface({ input: process.stdin, output, terminal: true });
process.stdout.write('Mot de passe administrateur (saisie masquée) : ');
prompt.question('', password => {
  prompt.close();
  process.stdout.write('\n');
  if (password.length < 16 || password.length > 256) {
    console.error('Utilisez une phrase secrète de 16 à 256 caractères.');
    process.exitCode = 1;
    return;
  }
  const salt = crypto.randomBytes(24).toString('base64url');
  let hash = `${salt}:${password}`;
  for (let iteration = 0; iteration < 10000; iteration++) hash = crypto.createHash('sha256').update(hash, 'utf8').digest('base64url');
  console.log(`ADMIN_SALT=${salt}\nADMIN_HASH=${hash}`);
});
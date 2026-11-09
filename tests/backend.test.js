const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');

function makeBackend() {
  const sheets = new Map();
  const spreadsheet = {
    getSheetByName: name => sheets.get(name),
    insertSheet(name) {
      const sheet = {
        rows: [],
        getLastRow() { return this.rows.length; },
        appendRow(row) { this.rows.push([...row]); },
        getDataRange() { return { getValues: () => this.rows.map(row => [...row]) }; },
        getRange(row, column) { return { setValues: values => { values[0].forEach((value, index) => { this.rows[row - 1][column - 1 + index] = value; }); } }; },
        deleteRow(row) { this.rows.splice(row - 1, 1); }
      };
      sheets.set(name, sheet);
      return sheet;
    }
  };
  const salt = 'test-salt';
  let hash = `${salt}:une phrase assez longue`;
  for (let iteration = 0; iteration < 10000; iteration++) hash = crypto.createHash('sha256').update(hash).digest('base64url');
  const properties = { SPREADSHEET_ID: 'test-spreadsheet', ADMIN_SALT: salt, ADMIN_HASH: hash };
  const utilities = {
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    getUuid: () => crypto.randomUUID(),
    base64EncodeWebSafe: value => Buffer.from(value).toString('base64url'),
    computeDigest: (algorithm, value) => crypto.createHash(algorithm).update(value).digest()
  };
  const context = vm.createContext({ SpreadsheetApp: { openById: () => spreadsheet }, Utilities: utilities, PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties[key] }) }, LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) }, ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) } });
  vm.runInContext(fs.readFileSync('backend/Code.gs', 'utf8'), context);
  context.setupSheets();
  const post = request => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(request) } }).text);
  const get = () => JSON.parse(context.doGet().text);
  return { post, get, sheets, setup: () => context.setupSheets() };
}

test('authentification, CRUD et confidentialité des noms', () => {
  const { post, get } = makeBackend();
  assert.equal(post({ action: 'login', password: 'mauvais' }).ok, false);
  assert.equal(post({ action: 'adminData', token: 'invalid' }).ok, false);
  const password = 'une phrase assez longue';
  assert.equal(post({ action: 'login', password }).ok, true);
  assert.deepEqual(post({ action: 'login', password }).data, {});
  assert.equal(post({ action: 'adminData', password: `${password}x` }).ok, false);
  const created = post({ action: 'saveGift', password, gift: { name: 'Lit', priceCents: 10000 } });
  assert.equal(created.ok, true);
  const giftId = created.data.gift.id;
  assert.equal(post({ action: 'contribute', giftId, name: 'Camille', type: 'participation', amountCents: 2500 }).ok, true);
  const publicData = get();
  assert.equal(publicData.data.gifts[0].raisedCents, 2500);
  assert.equal(JSON.stringify(publicData).includes('Camille'), false);
  assert.equal(post({ action: 'adminData', password }).data.contributions[0].name, 'Camille');
  assert.equal(post({ action: 'deleteGift', password, id: giftId }).ok, false);
  assert.equal(post({ action: 'saveGift', password, gift: { id: giftId, name: 'Lit', priceCents: 2000 } }).ok, false);
  const entry = post({ action: 'adminData', password }).data.contributions[0];
  assert.equal(post({ action: 'deleteContribution', password, id: entry.id }).ok, true);
  assert.equal(post({ action: 'deleteGift', password, id: giftId }).ok, true);
});

test('réservation exclusive et montants contrôlés', () => {
  const { post, get } = makeBackend();
  const password = 'une phrase assez longue';
  const giftId = post({ action: 'saveGift', password, gift: { name: 'Poussette', priceCents: 5000, productUrl: 'https://example.com/poussette' } }).data.gift.id;
  assert.equal(post({ action: 'contribute', giftId, name: 'A', type: 'participation', amountCents: 5001 }).ok, false);
  assert.equal(post({ action: 'contribute', giftId, name: 'A', type: 'participation', amountCents: 0 }).ok, false);
  const reservation = post({ action: 'contribute', giftId, name: 'A', type: 'reservation' });
  assert.equal(reservation.ok, true);
  assert.equal(reservation.data.productUrl, 'https://example.com/poussette');
  assert.equal(post({ action: 'contribute', giftId, name: 'B', type: 'reservation' }).ok, false);
  assert.equal(post({ action: 'contribute', giftId, name: 'B', type: 'participation', amountCents: 1 }).ok, false);
  assert.equal(post({ action: 'saveGift', password, gift: { id: giftId, name: 'Poussette', priceCents: 6000 } }).ok, false);
  assert.equal(get().data.gifts[0].reserved, true);
});

test('réglages et gestion des catégories avec cadeaux associés', () => {
  const { post, get } = makeBackend();
  const password = 'une phrase assez longue';
  assert.equal(post({ action: 'saveSettings', settings: { welcomeTitle: 'Bonjour', welcomeText: 'Bienvenue' } }).ok, false);
  assert.equal(post({ action: 'saveCategory', category: { name: 'Chambre' } }).ok, false);
  assert.equal(post({ action: 'deleteCategory', id: 'absent' }).ok, false);
  assert.equal(post({ action: 'saveSettings', password, settings: { welcomeTitle: 'Bonjour', welcomeText: 'Bienvenue' } }).ok, true);
  assert.equal(get().data.settings.welcomeText, 'Bienvenue');
  assert.equal(post({ action: 'saveCategory', password, category: { name: 'Chambre' } }).ok, true);
  assert.equal(post({ action: 'saveCategory', password, category: { name: 'chambre' } }).ok, false);
  assert.equal(post({ action: 'saveCategory', password, category: { name: 'Tous' } }).ok, false);
  const category = get().data.categories[0];
  const giftId = post({ action: 'saveGift', password, gift: { name: '=texte', category: 'Chambre', priceCents: 5000 } }).data.gift.id;
  assert.equal(post({ action: 'deleteCategory', password, id: category.id }).ok, false);
  assert.equal(post({ action: 'saveCategory', password, category: { id: category.id, name: 'Sommeil' } }).ok, true);
  assert.equal(get().data.gifts[0].category, 'Sommeil');
  assert.equal(get().data.gifts[0].name, "'=texte");
  assert.equal(post({ action: 'saveGift', password, gift: { id: giftId, name: 'Lit', category: 'Absente', priceCents: 5000 } }).ok, false);
  assert.equal(post({ action: 'deleteGift', password, id: giftId }).ok, true);
  assert.equal(post({ action: 'deleteCategory', password, id: category.id }).ok, true);
});

test('initialisation répétable et migration des catégories existantes', () => {
  const { get, sheets, setup } = makeBackend();
  sheets.get('Gifts').appendRow(['ancien', 'Berceau', '', 'Chambre', 5000, '', '', '']);
  setup(); setup();
  assert.equal(get().data.categories.length, 1);
  assert.equal(get().data.categories[0].name, 'Chambre');
  assert.equal(get().data.gifts[0].category, 'Chambre');
});

test('lien vendeur uniquement après réservation et seulement si renseigné', () => {
  const { post } = makeBackend();
  const password = 'une phrase assez longue';
  const withLink = post({ action: 'saveGift', password, gift: { name: 'Lit', priceCents: 5000, productUrl: 'https://example.com/lit' } }).data.gift.id;
  const withoutLink = post({ action: 'saveGift', password, gift: { name: 'Doudou', priceCents: 1000 } }).data.gift.id;
  assert.equal(post({ action: 'contribute', giftId: withLink, name: 'A', type: 'participation', amountCents: 100 }).data.productUrl, '');
  assert.equal(post({ action: 'contribute', giftId: withoutLink, name: 'B', type: 'reservation' }).data.productUrl, '');
});
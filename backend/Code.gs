const GIFT_HEADERS = ['id', 'name', 'description', 'category', 'priceCents', 'imageUrl', 'productUrl', 'createdAt'];
const CONTRIBUTION_HEADERS = ['id', 'giftId', 'name', 'type', 'amountCents', 'createdAt'];
const CATEGORY_HEADERS = ['id', 'name'];
const SETTING_HEADERS = ['key', 'value'];
const DEFAULT_SETTINGS = { welcomeTitle: 'Un petit être, beaucoup d’amour.', welcomeText: 'Bientôt, notre famille s’agrandit. Voici quelques idées pour accueillir bébé et préparer ses premiers moments parmi nous.' };
const PASSWORD_ITERATIONS = 10000;

function setupSheets() {
  const spreadsheet = openSpreadsheet();
  [["Gifts", GIFT_HEADERS], ["Contributions", CONTRIBUTION_HEADERS], ["Categories", CATEGORY_HEADERS], ["Settings", SETTING_HEADERS]].forEach(function (definition) {
    let sheet = spreadsheet.getSheetByName(definition[0]);
    if (!sheet) sheet = spreadsheet.insertSheet(definition[0]);
    if (sheet.getLastRow() === 0) sheet.appendRow(definition[1]);
  });
  const categories = readRows('Categories', CATEGORY_HEADERS).map(function (category) { return category.name; });
  readRows('Gifts', GIFT_HEADERS).forEach(function (gift) {
    if (gift.category && categories.indexOf(gift.category) < 0) {
      sheetFor('Categories').appendRow([Utilities.getUuid(), safeCell(String(gift.category))]);
      categories.push(gift.category);
    }
  });
  const existingSettings = readRows('Settings', SETTING_HEADERS).map(function (setting) { return setting.key; });
  Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
    if (existingSettings.indexOf(key) < 0) sheetFor('Settings').appendRow([key, DEFAULT_SETTINGS[key]]);
  });
}

function openSpreadsheet() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Identifiant du classeur non configuré.');
  return SpreadsheetApp.openById(id);
}

function doGet() {
  return respond(function () { return { gifts: listGifts(), categories: readRows('Categories', CATEGORY_HEADERS), settings: readSettings() }; });
}

function doPost(event) {
  return respond(function () {
    const request = JSON.parse(event.postData.contents);
    if (request.action === 'contribute') return withLock(function () { return contribute(request); });
    requirePassword(request.password);
    if (request.action === 'login') return {};
    if (request.action === 'adminData') return { gifts: listGifts(), contributions: readRows('Contributions', CONTRIBUTION_HEADERS), categories: readRows('Categories', CATEGORY_HEADERS), settings: readSettings() };
    if (request.action === 'saveGift') return withLock(function () { return saveGift(request.gift); });
    if (request.action === 'deleteGift') return withLock(function () { return deleteGift(request.id); });
    if (request.action === 'deleteContribution') return withLock(function () { return deleteContribution(request.id); });
    if (request.action === 'saveSettings') return withLock(function () { return saveSettings(request.settings); });
    if (request.action === 'saveCategory') return withLock(function () { return saveCategory(request.category); });
    if (request.action === 'deleteCategory') return withLock(function () { return deleteCategory(request.id); });
    throw new Error('Action inconnue.');
  });
}

function respond(callback) {
  try {
    return ContentService.createTextOutput(JSON.stringify({ ok: true, data: callback() })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.message || 'Une erreur est survenue.' })).setMimeType(ContentService.MimeType.JSON);
  }
}

function withLock(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return callback(); } finally { lock.releaseLock(); }
}

function sheetFor(name) {
  const sheet = openSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Le stockage n’est pas initialisé.');
  return sheet;
}

function readRows(name, headers) {
  const values = sheetFor(name).getDataRange().getValues();
  return values.slice(1).filter(function (row) { return row[0]; }).map(function (row) {
    const result = {};
    headers.forEach(function (header, index) { result[header] = row[index]; });
    return result;
  });
}

function listGifts() {
  const contributions = readRows('Contributions', CONTRIBUTION_HEADERS);
  return readRows('Gifts', GIFT_HEADERS).map(function (gift) {
    const entries = contributions.filter(function (entry) { return entry.giftId === gift.id; });
    gift.raisedCents = entries.reduce(function (sum, entry) { return sum + Number(entry.amountCents); }, 0);
    gift.reserved = entries.some(function (entry) { return entry.type === 'reservation'; });
    return gift;
  });
}

function cleanText(value, maxLength, required) {
  const text = String(value || '').trim();
  if ((required && !text) || text.length > maxLength) throw new Error('Veuillez vérifier les champs renseignés.');
  return text;
}

function safeCell(value) {
  return /^[\s]*[=+\-@]/.test(value) ? "'" + value : value;
}

function cleanUrl(value) {
  const url = cleanText(value, 2000, false);
  if (url && !/^https?:\/\/[^\s]+$/i.test(url)) throw new Error('Les liens doivent commencer par http:// ou https://.');
  return url;
}

function readSettings() {
  const settings = Object.assign({}, DEFAULT_SETTINGS);
  readRows('Settings', SETTING_HEADERS).forEach(function (entry) {
    if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, entry.key)) settings[entry.key] = entry.value;
  });
  return settings;
}

function saveSettings(input) {
  if (!input || typeof input !== 'object') throw new Error('Réglages invalides.');
  const values = { welcomeTitle: safeCell(cleanText(input.welcomeTitle, 120, true)), welcomeText: safeCell(cleanText(input.welcomeText, 500, true)) };
  const sheet = sheetFor('Settings');
  const rows = sheet.getDataRange().getValues();
  Object.keys(values).forEach(function (key) {
    const index = rows.findIndex(function (row, rowIndex) { return rowIndex > 0 && row[0] === key; });
    if (index < 0) sheet.appendRow([key, values[key]]);
    else sheet.getRange(index + 1, 1, 1, 2).setValues([[key, values[key]]]);
  });
  return {};
}

function saveCategory(input) {
  if (!input || typeof input !== 'object') throw new Error('Catégorie invalide.');
  const name = cleanText(input.name, 50, true);
  if (/^[=+\-@]/.test(name) || name.toLocaleLowerCase() === 'tous') throw new Error('Nom de catégorie invalide.');
  const categories = readRows('Categories', CATEGORY_HEADERS);
  const existing = input.id ? categories.find(function (category) { return category.id === input.id; }) : null;
  if (input.id && !existing) throw new Error('Catégorie introuvable.');
  if (categories.some(function (category) { return category.id !== input.id && String(category.name).toLocaleLowerCase() === name.toLocaleLowerCase(); })) throw new Error('Cette catégorie existe déjà.');
  const sheet = sheetFor('Categories');
  if (!existing) sheet.appendRow([Utilities.getUuid(), name]);
  else {
    const rows = sheet.getDataRange().getValues();
    const index = rows.findIndex(function (row, rowIndex) { return rowIndex > 0 && row[0] === existing.id; });
    sheet.getRange(index + 1, 1, 1, 2).setValues([[existing.id, name]]);
    const giftSheet = sheetFor('Gifts');
    giftSheet.getDataRange().getValues().forEach(function (row, rowIndex) {
      if (rowIndex > 0 && row[0] && row[3] === existing.name) {
        giftSheet.getRange(rowIndex + 1, 4, 1, 1).setValues([[name]]);
      }
    });
  }
  return {};
}

function deleteCategory(id) {
  const category = readRows('Categories', CATEGORY_HEADERS).find(function (item) { return item.id === id; });
  if (!category) throw new Error('Catégorie introuvable.');
  if (readRows('Gifts', GIFT_HEADERS).some(function (gift) { return gift.category === category.name; })) throw new Error('Modifiez d’abord les cadeaux de cette catégorie.');
  deleteRowById('Categories', id);
  return {};
}

function saveGift(input) {
  if (!input || typeof input !== 'object') throw new Error('Cadeau invalide.');
  const gifts = listGifts();
  const existing = input.id ? gifts.find(function (gift) { return gift.id === input.id; }) : null;
  if (input.id && !existing) throw new Error('Cadeau introuvable.');
  const price = Number(input.priceCents);
  if (!Number.isSafeInteger(price) || price < 1 || price > 100000000) throw new Error('Prix invalide.');
  if (existing && price < existing.raisedCents) throw new Error('Le prix ne peut pas être inférieur aux participations.');
  if (existing && existing.reserved && price !== Number(existing.priceCents)) throw new Error('Le prix d’un cadeau réservé ne peut pas être modifié.');
  const category = cleanText(input.category, 50, false);
  if (category && !readRows('Categories', CATEGORY_HEADERS).some(function (item) { return item.name === category; })) throw new Error('Catégorie introuvable.');
  const gift = {
    id: existing ? existing.id : Utilities.getUuid(),
    name: safeCell(cleanText(input.name, 100, true)),
    description: safeCell(cleanText(input.description, 1000, false)),
    category: safeCell(category),
    priceCents: price,
    imageUrl: cleanUrl(input.imageUrl),
    productUrl: cleanUrl(input.productUrl),
    createdAt: existing ? existing.createdAt : new Date().toISOString()
  };
  const sheet = sheetFor('Gifts');
  const row = GIFT_HEADERS.map(function (header) { return gift[header]; });
  if (existing) {
    const index = sheet.getDataRange().getValues().findIndex(function (item, rowIndex) { return rowIndex > 0 && item[0] === gift.id; });
    sheet.getRange(index + 1, 1, 1, row.length).setValues([row]);
  } else sheet.appendRow(row);
  return { gift: gift };
}

function deleteRowById(name, id) {
  const sheet = sheetFor(name);
  const values = sheet.getDataRange().getValues();
  const index = values.findIndex(function (row, rowIndex) { return rowIndex > 0 && row[0] === id; });
  if (index < 0) throw new Error('Élément introuvable.');
  sheet.deleteRow(index + 1);
}

function deleteGift(id) {
  if (readRows('Contributions', CONTRIBUTION_HEADERS).some(function (entry) { return entry.giftId === id; })) throw new Error('Supprimez d’abord les engagements associés.');
  deleteRowById('Gifts', id);
  return {};
}

function deleteContribution(id) {
  deleteRowById('Contributions', id);
  return {};
}

function contribute(request) {
  const gift = listGifts().find(function (item) { return item.id === request.giftId; });
  if (!gift) throw new Error('Cadeau introuvable.');
  const remaining = Number(gift.priceCents) - gift.raisedCents;
  if (gift.reserved || remaining <= 0) throw new Error('Ce cadeau n’est plus disponible.');
  const type = request.type;
  if (type !== 'reservation' && type !== 'participation') throw new Error('Type d’engagement invalide.');
  if (type === 'reservation' && gift.raisedCents > 0) throw new Error('Ce cadeau a déjà reçu des participations.');
  const amount = type === 'reservation' ? remaining : Number(request.amountCents);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > remaining) throw new Error('Le montant dépasse le reste à financer ou est invalide.');
  const name = safeCell(cleanText(request.name, 100, true));
  const productUrl = type === 'reservation' ? cleanUrl(gift.productUrl) : '';
  sheetFor('Contributions').appendRow([Utilities.getUuid(), gift.id, name, type, amount, new Date().toISOString()]);
  return { productUrl: productUrl };
}

function base64url(bytes) {
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function passwordHash(password, salt) {
  let value = salt + ':' + password;
  for (let iteration = 0; iteration < PASSWORD_ITERATIONS; iteration++) {
    value = base64url(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8));
  }
  return value;
}

function constantTimeEqual(left, right) {
  left = String(left); right = String(right);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return difference === 0;
}

function configuration() {
  const properties = PropertiesService.getScriptProperties();
  const salt = properties.getProperty('ADMIN_SALT');
  const hash = properties.getProperty('ADMIN_HASH');
  if (!salt || !hash) throw new Error('Authentification non configurée.');
  return { salt: salt, hash: hash };
}

function requirePassword(password) {
  const config = configuration();
  if (typeof password !== 'string' || password.length > 256 || !constantTimeEqual(passwordHash(password, config.salt), config.hash)) throw new Error('Mot de passe incorrect.');
}
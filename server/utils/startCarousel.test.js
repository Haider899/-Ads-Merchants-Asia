const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const startPage = path.resolve(__dirname, '../../views/start.html');
const carouselAsset = path.resolve(__dirname, '../../client/assets/img/starting-90fe7295.gif');

test('start page uses the historical wide rotating product carousel', () => {
  const source = fs.readFileSync(startPage, 'utf8');
  assert.match(source, /<img[^>]+src="client\/assets\/img\/starting-90fe7295\.gif"[^>]+id="start-gif-image"/);
  assert.doesNotMatch(source, /id="startProductOrbit"/);
  assert.ok(fs.existsSync(carouselAsset), 'the start carousel GIF must be present');
});

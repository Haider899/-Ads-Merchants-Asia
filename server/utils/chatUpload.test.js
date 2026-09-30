const test = require('node:test');
const assert = require('node:assert/strict');
const { isAllowedChatImage, getAttachmentUrl } = require('./chatUpload');

test('chat accepts supported image formats only', () => {
  assert.equal(isAllowedChatImage('image/jpeg', 'proof.jpg'), true);
  assert.equal(isAllowedChatImage('image/png', 'proof.png'), true);
  assert.equal(isAllowedChatImage('image/webp', 'proof.webp'), true);
  assert.equal(isAllowedChatImage('application/pdf', 'proof.pdf'), false);
  assert.equal(isAllowedChatImage('image/png', 'proof.exe'), false);
});

test('chat attachment URL is server-relative and uses the generated filename', () => {
  assert.equal(getAttachmentUrl({ filename: 'chat-123-safe.png' }), '/client/assets/uploads/chat/chat-123-safe.png');
  assert.equal(getAttachmentUrl(null), null);
});

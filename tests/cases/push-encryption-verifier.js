// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

function toBase64Url(arrayBuffer) {
  var buffer = new Uint8Array(arrayBuffer),
      base64 = btoa(String.fromCharCode.apply(null, buffer));

  return base64.replace(/=/g, '')
               .replace(/\+/g, '-')
               .replace(/\//g, '_');
}

function PushEncryptionVerifier(requirementsElement, element, popupBindings) {
  GeneratorBase.call(this, requirementsElement, element);

  popupBindings.forEach(function(binding) {
    binding.element.addEventListener('click', function(event) {
      DisplayDialog(binding.popup.cloneNode(true /* deep */));

      event.preventDefault();
    });
  });

  this.addRequirement(PushEncryptionVerifier.REQUIREMENT_SENDER_PUBLIC_KEY,
                      'Requires a valid public key to be set for the sender.');
  this.addRequirement(PushEncryptionVerifier.REQUIREMENT_SENDER_PRIVATE_KEY,
                      'Requires a valid private key to be set for the sender.');
  this.addRequirement(PushEncryptionVerifier.REQUIREMENT_RECEIVER_PUBLIC_KEY,
                      'Requires a valid public key to be set for the receiver.');
  this.addRequirement(PushEncryptionVerifier.REQUIREMENT_SALT,
                      'Requires a valid 16-byte salt to be set.');
  this.addRequirement(PushEncryptionVerifier.REQUIREMENT_AUTH_SECRET,
                      'Requires a valid 16-byte authentication secret to be set.');
  this.addRequirement(PushEncryptionVerifier.REQUIREMENT_PADDING,
                      'Requires a padding value in range of [0, 65536].');
}

PushEncryptionVerifier.prototype = Object.create(GeneratorBase.prototype);

PushEncryptionVerifier.REQUIREMENT_SENDER_PUBLIC_KEY = 1000;
PushEncryptionVerifier.REQUIREMENT_SENDER_PRIVATE_KEY = 1001;
PushEncryptionVerifier.REQUIREMENT_RECEIVER_PUBLIC_KEY = 1002;
PushEncryptionVerifier.REQUIREMENT_SALT = 1003;
PushEncryptionVerifier.REQUIREMENT_AUTH_SECRET = 1004;
PushEncryptionVerifier.REQUIREMENT_PADDING = 1005;

PushEncryptionVerifier.prototype.resetResults = function() {
  var self = this;

  ['ikm', 'prk', 'cek_info', 'nonce_info', 'cek', 'nonce', 'ciphertext'].forEach(function(field) {
    self.element_.querySelector('#' + field).value = '';
  });
};

PushEncryptionVerifier.prototype.update = function() {
  var state = this.computeState(true /* include_default */);
  var input = {
    senderPublic: this.getField(state, 'sender_public', null),
    senderPrivate: this.getField(state, 'sender_private', null),
    receiverPublic: this.getField(state, 'receiver_public', null),
    salt: this.getField(state, 'salt', null),
    authSecret: this.getField(state, 'auth_secret', null),
    padding: parseInt(this.getField(state, 'padding', 0), 10),
    plaintext: this.getField(state, 'plaintext', '')
  };

  var decodedInput = {};

  this.resetRequirements();
  this.resetResults();

  if (this.decodeToExpectedLength(decodedInput, input, 'senderPublic', 65))
    this.satisfyRequirement(PushEncryptionVerifier.REQUIREMENT_SENDER_PUBLIC_KEY);
  if (this.decodeToExpectedLength(decodedInput, input, 'senderPrivate', 32))
    this.satisfyRequirement(PushEncryptionVerifier.REQUIREMENT_SENDER_PRIVATE_KEY);
  if (this.decodeToExpectedLength(decodedInput, input, 'receiverPublic', 65))
    this.satisfyRequirement(PushEncryptionVerifier.REQUIREMENT_RECEIVER_PUBLIC_KEY);
  if (this.decodeToExpectedLength(decodedInput, input, 'salt', 16))
    this.satisfyRequirement(PushEncryptionVerifier.REQUIREMENT_SALT);
  if (this.decodeToExpectedLength(decodedInput, input, 'authSecret', 16))
    this.satisfyRequirement(PushEncryptionVerifier.REQUIREMENT_AUTH_SECRET);
  if (input.padding >= 0 && input.padding < 65536)
    this.satisfyRequirement(PushEncryptionVerifier.REQUIREMENT_PADDING);

  if (!this.verifyRequirements(true /* silent */))
    return;

  var senderKeys = KeyPair.import(decodedInput.senderPublic, decodedInput.senderPrivate);
  var receiverKeys = KeyPair.import(decodedInput.receiverPublic, null);

  var element = this.element_;
  Promise.all([ senderKeys, receiverKeys ]).then(function(keys) {
    var cryptographer = new WebPushCryptographer(keys[0], keys[1], decodedInput.authSecret);
    var salt = decodedInput.salt;

    cryptographer.deriveEncryptionKeys(salt).then(function(keys) {
      crypto.subtle.exportKey('raw', keys[0]).then(function(cek) {
        element.querySelector('#ikm').value = toBase64Url(keys[4]);
        element.querySelector('#prk').value = toBase64Url(keys[5]);
        element.querySelector('#cek_info').value = toBase64Url(keys[2]);
        element.querySelector('#cek').value = toBase64Url(cek);
        element.querySelector('#nonce_info').value = toBase64Url(keys[3]);
        element.querySelector('#nonce').value = toBase64Url(keys[1]);
      });
    });

    return cryptographer.encrypt(salt, input.plaintext, input.padding).then(function(ciphertext) {
      element.querySelector('#ciphertext').value = toBase64Url(ciphertext);
    });

  }).catch(function(error) { alert(error); });
};

  // Converts the URL-safe base64 encoded |base64UrlData| to an Uint8Array buffer.
PushEncryptionVerifier.prototype.base64UrlToUint8Array = function(base64UrlData) {
  var padding = '='.repeat((4 - base64UrlData.length % 4) % 4);
  var base64 = (base64UrlData + padding).replace(/\-/g, '+')
                                        .replace(/_/g, '/');

  var rawData = null;
  try {
    rawData = atob(base64);

  } catch (e) { return null; }

  var buffer = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; ++i)
    buffer[i] = rawData.charCodeAt(i);

  return buffer;
};

PushEncryptionVerifier.prototype.decodeToExpectedLength = function(output, input, field, length) {
  var buffer = this.base64UrlToUint8Array(input[field]);
  if (!buffer || buffer.byteLength != length)
    return false;

  output[field] = buffer;
  return true;
};

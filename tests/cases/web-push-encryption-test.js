// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

if (!String.prototype.hasOwnProperty('padRight')) {
  String.prototype.padRight = function(length, character) {
    if (length <= this.length)
      return this;

    var string = this;
    for (var i = this.length; i < length; ++i)
      string += character;

    return string;
  }
}

// Converts the |data| from an URL-safe base64 encoded string to an ArrayBuffer
// holding the same information.
function fromBase64Url(data) {
  var input = data.padRight(data.length + (4 - data.length % 4) % 4, '=')
                  .replace(/\-/g, '+')
                  .replace(/_/g, '/');

  return toArrayBuffer(atob(input));
}

// Converts |arrayBuffer| to a string, assuming ASCII content.
function toString(arrayBuffer) {
  return String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
}

// Source: https://github.com/martinthomson/http-encryption/pull/5/files
var REFERENCE = {
  recipient: {
    privateKey: '9FWl15_QUQAWDaD3k3l50ZBZQJ4au27F1V4F0uLSD_M',
    publicKey:  'BCEkBjzL8Z3C-oi2Q7oE5t2Np-p7osjGLg93qUP0wvqR' +
                'T21EEWyf0cQDQcakQMqz4hQKYOQ3il2nNZct4HgAUQU'
  },

  sender: {
    privateKey: 'vG7TmzUX9NfVR4XUGBkLAFu8iDyQe-q_165JkkN0Vlw',
    publicKey:  'BDgpRKok2GZZDmS4r63vbJSUtcQx4Fq1V58-6-3NbZzS' +
                'TlZsQiCEDTQy3CZ0ZMsqeqsEb7qW2blQHA4S48fynTk'
  },

  salt: 'Qg61ZJRva_XBE9IEUelU3A',

  ciphertext: 'G6j_sfKg0qebO62yXpTCayN2KV24QitNiTvLgcFiEj0',
  plaintext: 'I am the walrus'
};

var cryptographer = new WebPushEncryption();
cryptographer.setRecipientPublicKey(fromBase64Url(REFERENCE.recipient.publicKey));
cryptographer.setSenderKeys(fromBase64Url(REFERENCE.sender.privateKey),
                            fromBase64Url(REFERENCE.sender.publicKey));

cryptographer.setSalt(fromBase64Url(REFERENCE.salt));

// Note that the reference vector does not use an authentication secret.
cryptographer.authenticationSecret_ = new ArrayBuffer(0);

cryptographer.encrypt(toArrayBuffer(REFERENCE.plaintext)).then(function(ciphertext) {
  console.log('[1a] Ciphertext (' + ciphertext.byteLength + '): ', toBase64Url(ciphertext));

  cryptographer.decrypt(ciphertext).then(function(plaintext) {
    console.log('[1b] Plaintext (' + plaintext.byteLength + '): ', toString(plaintext));
  });

}).catch(function(error) {
  console.log(error);

});

cryptographer.decrypt(fromBase64Url(REFERENCE.ciphertext)).then(function(plaintext) {
  console.log('[2a] Plaintext (' + plaintext.byteLength + '): ', toString(plaintext));

  cryptographer.encrypt(plaintext).then(function(ciphertext) {
    console.log('[2b] Ciphertext (' + ciphertext.byteLength + '): ', toBase64Url(ciphertext));
  });

}).catch(function(error) {
  console.log(error);

});

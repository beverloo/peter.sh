(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Exposes the KeyPair and WebPushCryptographer functions on the global scope.
global.KeyPair = require('./src/keypair');
global.WebPushCryptographer = require('./src/cryptographer');

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./src/cryptographer":2,"./src/keypair":5}],2:[function(require,module,exports){
// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

const HKDF = require('./hkdf');
const KeyPair = require('./keypair');

// Utility function for UTF-8 encoding a string to an ArrayBuffer.
const utf8Encode = TextEncoder.prototype.encode.bind(new TextEncoder('utf-8'));

// Length, in bytes, of the salt that should be used for the message.
const SALT_BYTES = 16;

// Length, in bytes, of the prearranged authentication secret.
const AUTH_SECRET_BYTES = 16;

// Cryptographer that's able to encrypt and decrypt messages per the Web Push protocol's encryption.
//
// TODO: Add references to specifications to this comment.
class WebPushCryptographer {
  // Constructs a new instance of the cryptographer. Both |senderKeys| and |receiverKeys| must be
  // instances of the KeyPair class, wherein the |senderKeys| must have a private key set. The
  // |authSecret| must be an ArrayBuffer containing 16 bytes containing the prearranged secret.
  constructor(senderKeys, receiverKeys, authSecret) {
    if (!(senderKeys instanceof KeyPair))
      throw new Error('The senderKeys must be an instance of the KeyPair class.');

    if (!senderKeys.privateKey)
      throw new Error('The senderKeys must have a private key set.');

    if (!(receiverKeys instanceof KeyPair))
      throw new Error('The receiverKeys must be an instance of the KeyPair class.');

    if (!(authSecret instanceof ArrayBuffer) && !(authSecret instanceof Uint8Array))
      throw new Error('The authSecret is expected to be an ArrayBuffer.');

    if (false && authSecret.byteLength != AUTH_SECRET_BYTES)
      throw new Error('The authSecret is expected to be ' + AUTH_SECRET_BYTES + ' bytes.');

    this.senderKeys_ = senderKeys;
    this.receiverKeys_ = receiverKeys;
    this.authSecret_ = new Uint8Array(authSecret);
  }

  // Gets the KeyPair instance representing the sender's key-pair.
  get senderKeys() { return this.senderKeys_; }

  // Gets the KeyPair instance representing the receiver's key-pair.
  get receiverKeys() { return this.receiverKeys_; }

  // Gets an Uint8Array containing the prearranged auth secret between the sender and receiver.
  get authSecret() { return this.authSecret_; }

  // Decrypts |ciphertext|, which must be an ArrayBuffer. The |salt| must be an ArrayBuffer
  // containing sixteen bytes of information. A promise will be returned that will be resolved with
  // the plaintext, as an ArrayBuffer, when the decryption operation has completed.
  decrypt(salt, ciphertext) {
    return this.deriveEncryptionKeys(salt).then(([contentEncryptionKey, nonce]) => {
      if (!(ciphertext instanceof ArrayBuffer))
        throw new Error('The ciphertext is expected to be an ArrayBuffer.');

      const algorithm = { name: 'AES-GCM', tagLength: 128, iv: nonce };

      return crypto.subtle.decrypt(algorithm, contentEncryptionKey, ciphertext);

    }).then(plaintext => {
      // TODO: Get the data out of the record.
      return plaintext;
    });
  }

  // Encrypts |plaintext|, which must either be a string or an ArrayBuffer. The |salt| must be an
  // ArrayBuffer containing sixteen bytes of information. Optionally, up to 65535 bytes of padding
  // can be added by padding an |paddingBytes| argument. A promise will be returned that will be
  // resolved with an ArrayBuffer when the encryption operation has completed.
  encrypt(salt, plaintext, paddingBytes) {
    paddingBytes = paddingBytes || 0;

    return Promise.resolve().then(() => {
      if (!(plaintext instanceof ArrayBuffer))
        plaintext = utf8Encode(plaintext);

      if (paddingBytes < 0 || paddingBytes > 65535)
        throw new Error('The paddingBytes must be between 0 and 65535 (inclusive).');

      return this.deriveEncryptionKeys(salt);

    }).then(([contentEncryptionKey, nonce]) => {
      const record = new Uint8Array(2 + paddingBytes + plaintext.byteLength);
      record.set([ paddingBytes & 0xFF, paddingBytes >> 8 ]);
      record.fill(0, 2 /* sizeof(uint16_t) */, 2 + paddingBytes);
      record.set(new Uint8Array(plaintext), 2 + paddingBytes);

      const algorithm = { name: 'AES-GCM', tagLength: 128, iv: nonce };

      return crypto.subtle.encrypt(algorithm, contentEncryptionKey, record);
    });
  }

  // Derives the encryption keys to be used for this cryptographer. The returned promise will be
  // resolved with the {contentEncryptionKey, nonce, nonceInfo, cekInfo, IKM, PRK}. Note that only
  // the CEK and nonce will be used by this class, the rest is exposed for debugging purposes.
  deriveEncryptionKeys(salt) {
    return Promise.resolve().then(() => {
      if (!(salt instanceof ArrayBuffer) && !(salt instanceof Uint8Array))
        throw new Error('The salt is expected to be an ArrayBuffer.');

      if (salt.byteLength != SALT_BYTES)
        throw new Error('The salt is expected to be ' + SALT_BYTES + ' bytes.');

      salt = new Uint8Array(salt);

      return Promise.all([
        this.senderKeys_.deriveSharedSecret(this.receiverKeys_),

        this.senderKeys_.exportPublicKey(),
        this.receiverKeys_.exportPublicKey()
      ]);

    }).then(([ikm, senderPublic, receiverPublic]) => {
      // Info to use when extracting from the IKM and authentication secret HKDF.
      const authInfo = utf8Encode('Content-Encoding: auth\0');

      // Infos to use when extracting from the PRK and message salt HKDF.
      const contentEncryptionKeyInfo = this.deriveInfo('aesgcm', senderPublic, receiverPublic);
      const nonceInfo = this.deriveInfo('nonce', senderPublic, receiverPublic);

      // The first HKDF is fixed between the sender and receiver, whereas the second, per-message
      // HKDF incorporates the salt that is expected to be unique per message.
      const hkdf = new HKDF(ikm, this.authSecret_);
      return hkdf.extract(authInfo, 32).then(prk => {
        const messageHkdf = new HKDF(prk, salt);

        return Promise.all([
          messageHkdf.extract(contentEncryptionKeyInfo, 16).then(bits =>
              crypto.subtle.importKey(
                  'raw', bits, 'AES-GCM', true /* extractable */, ['decrypt', 'encrypt'])),
          messageHkdf.extract(nonceInfo, 12),
          contentEncryptionKeyInfo, nonceInfo, ikm, prk
        ]);
      });

    });
  }

  // Derives the info used for extracting the content encryption key and the nonce from the HKDF
  // created using the PRK and the message's salt. It combines a Content-Encoding header with a
  // given |contentEncoding| value with a |context| that contains the public keys of both the sender
  // and recipient. Both |senderPublic| and |receiverPublic| must be Uint8Arrays containing the
  // respective public keys in uncompressed EC form per SEC 2.3.3.
  //
  // context = label || 0x00 ||
  //           length(receiverPublic) || receiverPublic ||
  //           length(senderPublic) || senderPublic
  //
  // cek_info = "Content-Encoding: aesgcm" || 0x00 || context
  // nonce_info = "Content-Encoding: nonce" || 0x00 || context
  //
  // This method is synchronous, and will return an Uint8Array with the generated info buffer.
  deriveInfo(contentEncoding, senderPublic, receiverPublic) {
    const label = utf8Encode('P-256');  // always set to P-256

    let buffer = new Uint8Array(18 + contentEncoding.length + 1 + label.length + 1 + 2 * (2 + 65));
    let offset = 0;

    // Content-Encoding: |contentEncoding| || 0x00
    buffer.set(utf8Encode('Content-Encoding: '));
    buffer.set(utf8Encode(contentEncoding), 18);
    buffer.set([0x00], 18 + contentEncoding.length);

    offset += 18 + contentEncoding.length + 1;

    // label || 0x00
    buffer.set(label, offset);
    buffer.set([0x00], offset + label.length);

    offset += label.length + 1;

    // length(receiverPublic) || receiverPublic
    buffer.set([0x00, receiverPublic.byteLength], offset);
    buffer.set(receiverPublic, offset + 2);

    offset += 2 + receiverPublic.byteLength;

    // length(senderPublic) || senderPublic
    buffer.set([0x00, senderPublic.byteLength], offset);
    buffer.set(senderPublic, offset + 2);

    return buffer;
  }
};

module.exports = WebPushCryptographer;

},{"./hkdf":3,"./keypair":5}],3:[function(require,module,exports){
// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

const HMAC = require('./hmac');

// TODO: Document the HKDF class.
// TODO: Add input validation to the HKDF class.
class HKDF {
  constructor(ikm, salt) {
    const hmac = new HMAC(salt);

    this.extractPromise_ = hmac.sign(ikm).then(prk => new HMAC(prk));
  }

  extract(rawInfo, byteLength) {
    let info = new Uint8Array(rawInfo.byteLength + 1);
    info.set(rawInfo);
    info.set([1], rawInfo.length);

    return this.extractPromise_.then(prkHmac => prkHmac.sign(info))
                               .then(hash => hash.slice(0, byteLength));
  }
};

module.exports = HKDF;

},{"./hmac":4}],4:[function(require,module,exports){
// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// TODO: Document the HMAC class.
// TODO: Add input validation to the HMAC class.
class HMAC {
  constructor(ikm) {
    this.signPromise_ = crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' },
                                                false /* extractable */, ['sign']);
  }

  sign(input) {
    return this.signPromise_.then(key => crypto.subtle.sign('HMAC', key, input));
  }
};

module.exports = HMAC;

},{}],5:[function(require,module,exports){
// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

const base64UrlToUint8Array = require('./util').base64UrlToUint8Array;
const uint8ArrayToBase64Url = require('./util').uint8ArrayToBase64Url;

// Length, in bytes, of a P-256 field element. Expected format of the private key.
const PRIVATE_KEY_BYTES = 32;

// Length, in bytes, of a P-256 public key in uncompressed EC form per SEC 2.3.3. This sequence must
// start with 0x04. Expected format of the public key.
const PUBLIC_KEY_BYTES = 65;

// Class representing a NIST P-256 Key Pair. A private/public key-pair can be generated by calling
// the KeyPair.generate() method, or a key-pair (in which the private key is optional) can be
// imported by calling KeyPair.import().
//
// The implementation converts to and from JWK at various places to work around the fact that
// working with raw ECDH keying material is not commonly available in Web browsers.
class KeyPair {
  constructor(publicKey, privateKey) {
    this.publicKey_ = publicKey;
    this.privateKey_ = privateKey;
  }

  // Returns a promise with the P-256 KeyPair instance that will resolve when it has been generated.
  static generate() {
    return Promise.resolve().then(() => {
      return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' },
                                       true /* extractable */, ['deriveBits']);

    }).then(keys => new KeyPair(keys.publicKey, keys.privateKey));
  }

  // Returns a promise with the P-256 KeyPair instance that will resolve when the |publicKey| and,
  // when given, the |privateKey| have been verified and imported. Both |publicKey| and |privateKey|
  // are expected to be ArrayBuffers, wherein |publicKey| contains the 65-byte uncompressed EC
  // points and the |privateKey| contains the 32-byte private value.
  static import(publicKey, privateKey) {
    return Promise.resolve().then(() => {
      if (!(publicKey instanceof ArrayBuffer) && !(publicKey instanceof Uint8Array))
        throw new Error('The publicKey is expected to be an ArrayBuffer.');

      if (publicKey.byteLength != PUBLIC_KEY_BYTES)
        throw new Error('The publicKey is expected to be ' + PUBLIC_KEY_BYTES + ' bytes.');

      const publicBuffer = new Uint8Array(publicKey);
      if (publicBuffer[0] != 0x04)
        throw new Error('The publicKey is expected to start with an 0x04 byte.');

      let jwk = {
        kty: 'EC',
        crv: 'P-256',
        x: uint8ArrayToBase64Url(publicBuffer, 1, 33),
        y: uint8ArrayToBase64Url(publicBuffer, 33, 65),
        ext: true
      };

      let privatePromise = Promise.resolve(null);
      let publicPromise = crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' },
                                                  true /* extractable */, []);

      if (privateKey) {
        if (!(privateKey instanceof ArrayBuffer) && !(privateKey instanceof Uint8Array))
          throw new Error('The privateKey is expected to be an ArrayBuffer.');

        if (privateKey.byteLength != PRIVATE_KEY_BYTES) {
          throw new Error('The privateKey is expected to be ' + PRIVATE_KEY_BYTES +' bytes.');
        }

        jwk.d = uint8ArrayToBase64Url(new Uint8Array(privateKey));

        privatePromise = crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' },
                                                  true /* extractable */, ['deriveBits']);
      }

      return Promise.all([ publicPromise, privatePromise ]);

    }).then(([publicKey, privateKey]) => new KeyPair(publicKey, privateKey));
  }

  // Returns a promise that will be resolved with an ArrayBuffer containing the 32-byte shared
  // secret between |this| and |peerKeyPair|. |this| must have both the public and private key set,
  // whereas only the public key is required for |peerKeyPair|.
  deriveSharedSecret(peerKeyPair) {
    return Promise.resolve().then(() => {
      if (!this.privateKey_)
        throw new Error('The private key must be known when deriving the shared secret.');

      if (!(peerKeyPair instanceof KeyPair))
        throw new Error('The peerKeyPair must be a KeyPair instance.');

      const algorithm = { name: 'ECDH', namedCurve: 'P-256', public: peerKeyPair.publicKey };

      return crypto.subtle.deriveBits(algorithm, this.privateKey_, 256);
    });
  }

  // Gets the CryptoKey containing the public key of this key pair.
  get publicKey() { return this.publicKey_; }

  // Returns a promise that will be resolved with an ArrayBuffer containing the pair's public key in
  // uncompressed EC form, a 65-byte sequence containing two P-256 field elements.
  exportPublicKey() {
    return crypto.subtle.exportKey('jwk', this.publicKey_).then(jwk => {
      const x = base64UrlToUint8Array(jwk.x);
      const y = base64UrlToUint8Array(jwk.y);

      let publicKey = new Uint8Array(65);
      publicKey.set([0x04], 0);
      publicKey.set(x, 1);
      publicKey.set(y, 33);

      return publicKey;
    });
  }

  // Gets the CryptoKey containing the private key of this key pair.
  get privateKey() { return this.privateKey_; }

  // Returns a promise that will be resolved with an ArrayBuffer containing the pair's private key,
  // which is a 32-byte long P-256 field element.
  exportPrivateKey() {
    return crypto.subtle.exportKey('jwk', this.privateKey_).then(jwk =>
        base64UrlToUint8Array(jwk.d));
  }
};

module.exports = KeyPair;

},{"./util":6}],6:[function(require,module,exports){
// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Converts the |uint8Array| to an URL-safe base64 encoded string. When provided, |start| and |end|
// indicate the range within the |uint8Array| that should be converted.
function uint8ArrayToBase64Url(uint8Array, start, end) {
  start = start || 0;
  end = end || uint8Array.byteLength;

  const base64 = btoa(String.fromCharCode.apply(null, uint8Array.slice(start, end)));
  return base64.replace(/=/g, '')
               .replace(/\+/g, '-')
               .replace(/\//g, '_');
}

// Converts the URL-safe base64 encoded |base64UrlData| to an Uint8Array buffer.
function base64UrlToUint8Array(base64UrlData) {
  const padding = '='.repeat((4 - base64UrlData.length % 4) % 4);
  const base64 = (base64UrlData + padding).replace(/\-/g, '+')
                                          .replace(/_/g, '/');

  const rawData = atob(base64);
  const buffer = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i)
    buffer[i] = rawData.charCodeAt(i);

  return buffer;
}

module.exports = { uint8ArrayToBase64Url, base64UrlToUint8Array };

},{}]},{},[1]);

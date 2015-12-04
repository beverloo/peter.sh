// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Converts the contents of |arrayBuffer| in range of [start, end] to an URL-
// safe base64 encoded representation.
function toBase64Url(arrayBuffer, start, end) {
  var buffer = new Uint8Array(arrayBuffer.slice(start, end)),
      base64 = btoa(String.fromCharCode.apply(null, buffer));

  return base64.replace(/=/g, '')
               .replace(/\+/g, '-')
               .replace(/\//g, '_');
}

// Converts the string |data| to an ArrayBuffer. All characters in the string
// are expected to be in range of [0, 255].
function toArrayBuffer(data) {
  var buffer = new ArrayBuffer(data.length),
      bufferView = new Uint8Array(buffer);

  for (var i = 0; i < data.length; ++i)
    bufferView[i] = data.charCodeAt(i);

  return buffer;
}

// -----------------------------------------------------------------------------

// Implementation of Web Push Encryption based on WebCrypto that provides
// routines both for encrypting and decrypting content.
function WebPushEncryption() {
  this.recipientPublicKey_ = null;
  this.senderKeys_ = null;  // either CryptoKeys or ArrayBuffers

  this.salt_ = null;
  this.authenticationSecret_ = null;
}

WebPushEncryption.P256_FIELD_BYTES = 32;
WebPushEncryption.P256_UNCOMPRESSED_POINT_BYTES = 65;

WebPushEncryption.SALT_SIZE = 16;
WebPushEncryption.MIN_AUTH_SECRET_BYTES = 16;

// Sets |publicKey| as the public key associated with the recipient. It must
// be an ArrayBuffer containing a NIST P-256 uncompressed EC point.
WebPushEncryption.prototype.setRecipientPublicKey = function(publicKey) {
  if (!(publicKey instanceof ArrayBuffer) ||
      publicKey.byteLength != WebPushEncryption.P256_UNCOMPRESSED_POINT_BYTES) {
    throw new Error('The publicKey is expected to be a 65-byte ArrayBuffer.');
  }

  this.recipientPublicKey_ = publicKey;
};

// Creates a new public/private key pair for the sender. Returns a Promise that
// will be resolved once the keys have been created.
WebPushEncryption.prototype.createSenderKeys = function() {
  var self = this;

  return Promise.resolve().then(function() {
    return crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);

  }).then(function(keys) {
    self.senderKeys_ = keys;
  });
};

// Sets |privateKey| and |publicKey| as the key-pair associated with the sender.
// Both must be ArrayBuffer instances, respectively having 32- and 65 bytes
// of content. (As indicated by the constants.)
WebPushEncryption.prototype.setSenderKeys = function(privateKey, publicKey) {
  if (!(privateKey instanceof ArrayBuffer) ||
      privateKey.byteLength != WebPushEncryption.P256_FIELD_BYTES) {
    throw new Error('The privateKey is expected to be a 32-byte ArrayBuffer.');
  }

  if (!(publicKey instanceof ArrayBuffer) ||
      publicKey.byteLength != WebPushEncryption.P256_UNCOMPRESSED_POINT_BYTES) {
    throw new Error('The publicKey is expected to be a 65-byte ArrayBuffer.');
  }

  this.senderKeys_ = {
    privateKey: privateKey,
    publicKey: publicKey
  };
};

// Creates a salt of appropriate size for the payload.
WebPushEncryption.prototype.createSalt = function() {
  this.salt_ = new Uint8Array(WebPushEncryption.SALT_SIZE);
  crypto.getRandomValues(this.salt_);
};

// Sets the salt to use for the payload to |salt|. It must be an ArrayBuffer
// having 16-bytes of data.
WebPushEncryption.prototype.setSalt = function(salt) {
  if (!(salt instanceof ArrayBuffer) ||
      salt.byteLength != WebPushEncryption.SALT_SIZE) {
    throw new Error('The salt is expected to be a 16-byte ArrayBuffer.');
  }

  this.salt_ = salt;
}

// Sets the authentication secret to use for creating the payload to |secret|,
// which must be an ArrayBuffer having at least 16 bytes of data.
WebPushEncryption.prototype.setAuthenticationSecret = function(secret) {
  if (!(secret instanceof ArrayBuffer) ||
      secret.byteLength != WebPushEncryption.MIN_AUTH_SECRET_BYTES) {
    throw new Error('The secret is expected to be a >=16-byte ArrayBuffer.');
  }

  this.authenticationSecret_ = secret;
};

// Derives the shared secret between the sender's private key and the recipient
// their public key. Assumes usage of the NIST P-256 curves.
WebPushEncryption.prototype.deriveSharedSecret = function() {
  var self = this;

  var recipientPublicKey = null;
  return Promise.resolve().then(function() {
    // (1) Import the recipient's public key, which is an EC uncompressed point.
    var jwk = {
      kty: 'EC',
      crv: 'P-256',
      x: toBase64Url(self.recipientPublicKey_, 1, 33),
      y: toBase64Url(self.recipientPublicKey_, 33, 65)
    };

    return crypto.subtle.importKey(
        'jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);

  }).then(function(publicKey) {
    recipientPublicKey = publicKey;

    // (2) Create a CryptoKey instance for the ECDH P-256 private key.
    // (2a) When already created, return the existing instance instead.
    if (self.senderKeys_.privateKey instanceof CryptoKey)
      return self.senderKeys_.privateKey;

    // (2b) Import the private key by creating another JWK object.
    var jwk = {
      kty: 'EC',
      crv: 'P-256',
      x: toBase64Url(self.senderKeys_.publicKey, 1, 33),
      y: toBase64Url(self.senderKeys_.publicKey, 33, 65),
      d: toBase64Url(self.senderKeys_.privateKey, 0, 32),
      ext: true
    };

    return crypto.subtle.importKey(
        'jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false,
        ['deriveBits']);

  }).then(function(privateKey) {
    // (3) Derive the shared secret between the sender and the recipient.
    return crypto.subtle.deriveBits(
        { name: 'ECDH', namedCurve: 'P-256', public: recipientPublicKey },
        privateKey, WebPushEncryption.P256_FIELD_BYTES * 8);

  });
};

// Drives the encryption keys to use for the payload - the content encryption
// key, and the nonce (which will be used as the IV to AES-128-GCM). These
// account for the CEK and Nonce info parameters that contain the public keys
// of both the sender and the recipient of the message.
WebPushEncryption.prototype.deriveEncryptionKeys = function(sharedSecret) {
  var self = this;

  return crypto.subtle.importKey(
      'raw', sharedSecret, { name: 'HKDF' }, false,
      ['deriveKey', 'deriveBits']).then(function(sharedKey) {
    // (4) Derive the pseudo-random key (PRK) from the |sharedSecret| (IKM) and
    // the authentication secret, when set. Note that Web Push clients will
    // require the authentication secret to be set.
    if (!self.authenticationSecret_ || !self.authenticationSecret_.byteLength)
      return sharedKey;

    var algorithm = {
      name: 'HKDF',
      hash: { name: 'SHA-256' },
      salt: self.authenticationSecret_,
      info: toArrayBuffer("Content-Encoding: auth")
    };

    return crypto.subtle.deriveBits(
        algorithm, sharedKey, 256).then(function(bits) {
      return crypto.subtle.importKey(
          'raw', sharedSecret, { name: 'HKDF' }, false,
          ['deriveKey', 'deriveBits']);
    });

  }).then(function(prk) {
    // (5) Derive the context for the info parameters used to determine the
    // content encryption key and the nonce (IV). It contains the public keys
    // of both the recipient and the sender.
    //
    // context = label || 0x00 ||
    //           length(recipient_public) || recipient_public ||
    //           length(sender_public) || sender_public

    var context = new Uint8Array(5 + 1 + 2 + 65 + 2 + 65);
    context.set([0x50, 0x2D, 0x32, 0x35, 0x36], 0);  // "P-256"

    context.set([0x00, self.recipientPublicKey_.byteLength], 6);
    context.set(new Uint8Array(self.recipientPublicKey_), 8);

    context.set([0x00, self.senderKeys_.publicKey.byteLength], 73);
    context.set(new Uint8Array(self.senderKeys_.publicKey), 75);

    // (6) Derive the cek_info and the nonce_info.
    //
    // cek_info = "Content-Encoding: aesgcm128" || 0x00 || context
    // nonce_info = "Content-Encoding: nonce" || 0x00 || context

    var cekInfo = new Uint8Array(27 + 1 + context.byteLength);
    var nonceInfo = new Uint8Array(23 + 1 + context.byteLength);

    cekInfo.set(new Uint8Array(toArrayBuffer('Content-Encoding: aesgcm128')));
    cekInfo.set(context, 28);

    nonceInfo.set(new Uint8Array(toArrayBuffer('Content-Encoding: nonce')));
    nonceInfo.set(context, 24);

    // (7) Derive the content encryption key and the nonce at the same time,
    // and return an object having both to the next user of the promise chain.
    var cekAlgorithm = {
      name: 'HKDF',
      hash: { name: 'SHA-256' },
      salt: self.salt_,
      info: cekInfo
    };

    var nonceAlgorithm = {
      name: 'HKDF',
      hash: { name: 'SHA-256' },
      salt: self.salt_,
      info: nonceInfo
    };

    return Promise.all([
      crypto.subtle.deriveKey(
          cekAlgorithm, prk, { name: 'AES-GCM', length: 128 }, false, ['encrypt', 'decrypt']),
      crypto.subtle.deriveBits(nonceAlgorithm, prk, 96)

    ]).then(function(results) {
      return {
        contentEncryptionKey: results[0],
        nonce: results[1]
      };
    });
  });
};

// Encrypts |plaintext|, which must be an ArrayBuffer holding the plaintext data
// with the encryption information known to this class. Optionally, between 0
// and 255 bytes of padding data can be provided in |paddingBytes| to hide the
// length of the content.
WebPushEncryption.prototype.encrypt = function(plaintext, paddingBytes) {
  if (!(plaintext instanceof ArrayBuffer))
    throw new Error('The input plaintext must be given in an ArrayBuffer.');

  paddingBytes = paddingBytes || 0;
  if (typeof paddingBytes != 'number' || paddingBytes < 0 || paddingBytes > 255)
    throw new Error('The number of padding bytes must be between 0 and 255.');

  var self = this;
  return this.deriveSharedSecret().then(function(sharedSecret) {
    return self.deriveEncryptionKeys(sharedSecret);

  }).then(function(keys) {
    var encryptionInfo = {
      name: 'AES-GCM',
      iv: keys.nonce,
      tagLength: 128
    };

    // Create the record for the data, which is a byte for the length of the
    // padding, followed by a number of NULL bytes for the padding, followed by
    // the actual content of the plaintext.
    var record = new Uint8Array(1 + paddingBytes + plaintext.byteLength);
    record.set([ 0 ]);
    record.set(new Uint8Array(plaintext), 1 + paddingBytes);

    return crypto.subtle.encrypt(
        encryptionInfo, keys.contentEncryptionKey, record);
  });
};

// Decrypts the |ciphertext| with the encryption information known within this
// instance. Padding prepended to the record will be removed automatically.
WebPushEncryption.prototype.decrypt = function(ciphertext) {
  var self = this;

  return this.deriveSharedSecret().then(function(sharedSecret) {
    return self.deriveEncryptionKeys(sharedSecret);

  }).then(function(keys) {
    var decryptionInfo = {
      name: 'AES-GCM',
      iv: keys.nonce,
      tagLength: 128
    };

    return crypto.subtle.decrypt(
        decryptionInfo, keys.contentEncryptionKey, ciphertext);

  }).then(function(recordBuffer) {
    var record = new Uint8Array(recordBuffer),
        paddingBytes = record[0];

    return recordBuffer.slice(1 + paddingBytes);
  });
};

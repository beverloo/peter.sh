(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Exposes the KeyPair and WebPushCryptographer functions on the global scope.
global.KeyPair = require('./src/keypair');
global.WebPushCryptographerDraft03 = require('./src/cryptographer_draft_03');
global.WebPushCryptographerDraft08 = require('./src/cryptographer_draft_08');

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./src/cryptographer_draft_03":3,"./src/cryptographer_draft_08":4,"./src/keypair":7}],2:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

var KeyPair = require('./keypair');

// Length, in bytes, of the prearranged authentication secret.
var AUTH_SECRET_BYTES = 16;

// Cryptographer that's able to encrypt and decrypt messages per the Web Push protocol's encryption.
// The cryptography is explained in ietf-webpush-encryption and ietf-httpbis-encryption-encoding:
//
// https://tools.ietf.org/html/draft-ietf-webpush-encryption
// https://tools.ietf.org/html/draft-ietf-httpbis-encryption-encoding
//
// This implementation supports the drafts as of February 2016, requires an authentication secret
// to be used and allows for record padding between 0 and 65535 octets.

var WebPushCryptographer = function () {
  // Constructs a new instance of the cryptographer. Both |senderKeys| and |receiverKeys| must be
  // instances of the KeyPair class, wherein the |senderKeys| must have a private key set. The
  // |authSecret| must be an ArrayBuffer containing 16 bytes containing the prearranged secret.

  function WebPushCryptographer(senderKeys, receiverKeys, authSecret) {
    _classCallCheck(this, WebPushCryptographer);

    if (!(senderKeys instanceof KeyPair)) throw new Error('The senderKeys must be an instance of the KeyPair class.');

    if (!senderKeys.privateKey) throw new Error('The senderKeys must have a private key set.');

    if (!(receiverKeys instanceof KeyPair)) throw new Error('The receiverKeys must be an instance of the KeyPair class.');

    if (!(authSecret instanceof ArrayBuffer) && !(authSecret instanceof Uint8Array)) throw new Error('The authSecret is expected to be an ArrayBuffer.');

    if (false && authSecret.byteLength != AUTH_SECRET_BYTES) throw new Error('The authSecret is expected to be ' + AUTH_SECRET_BYTES + ' bytes.');

    this.senderKeys_ = senderKeys;
    this.receiverKeys_ = receiverKeys;
    this.authSecret_ = new Uint8Array(authSecret);
  }

  // Gets the KeyPair instance representing the sender's key-pair.


  _createClass(WebPushCryptographer, [{
    key: 'decrypt',


    // Decrypts |ciphertext|, which must be an ArrayBuffer. The |salt| must be an ArrayBuffer
    // containing sixteen bytes of information. A promise will be returned that will be resolved with
    // the plaintext, as an ArrayBuffer, when the decryption operation has completed.
    value: function decrypt(salt, ciphertext) {
      throw new Error('WebPushCryptographer must not be used directly.');
    }

    // Encrypts |plaintext|, which must either be a string or an ArrayBuffer. The |salt| must be an
    // ArrayBuffer containing sixteen bytes of information. Optionally, up to 65535 bytes of padding
    // can be added by padding an |paddingBytes| argument. A promise will be returned that will be
    // resolved with an ArrayBuffer when the encryption operation has completed.

  }, {
    key: 'encrypt',
    value: function encrypt(salt, plaintext, paddingBytes) {
      throw new Error('WebPushCryptographer must not be sued directly.');
    }
  }, {
    key: 'senderKeys',
    get: function get() {
      return this.senderKeys_;
    }

    // Gets the KeyPair instance representing the receiver's key-pair.

  }, {
    key: 'receiverKeys',
    get: function get() {
      return this.receiverKeys_;
    }

    // Gets an Uint8Array containing the prearranged auth secret between the sender and receiver.

  }, {
    key: 'authSecret',
    get: function get() {
      return this.authSecret_;
    }
  }]);

  return WebPushCryptographer;
}();

module.exports = WebPushCryptographer;

},{"./keypair":7}],3:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

var HKDF = require('./hkdf');
var WebPushCryptographer = require('./cryptographer');

// Utility function for UTF-8 encoding a string to an ArrayBuffer.
var utf8Encode = TextEncoder.prototype.encode.bind(new TextEncoder('utf-8'));

// Length, in bytes, of the salt that should be used for the message.
var SALT_BYTES = 16;

// Implementation of the WebPushCryptographer following draft -03.

var WebPushCryptographerDraft03 = function (_WebPushCryptographer) {
  _inherits(WebPushCryptographerDraft03, _WebPushCryptographer);

  function WebPushCryptographerDraft03() {
    _classCallCheck(this, WebPushCryptographerDraft03);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(WebPushCryptographerDraft03).apply(this, arguments));
  }

  _createClass(WebPushCryptographerDraft03, [{
    key: 'decrypt',
    value: function decrypt(salt, ciphertext) {
      return this.deriveEncryptionKeys(salt).then(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var contentEncryptionKey = _ref2[0];
        var nonce = _ref2[1];

        if (!(ciphertext instanceof ArrayBuffer)) throw new Error('The ciphertext is expected to be an ArrayBuffer.');

        var algorithm = { name: 'AES-GCM', tagLength: 128, iv: nonce };

        return crypto.subtle.decrypt(algorithm, contentEncryptionKey, ciphertext);
      }).then(function (plaintext) {
        var plaintextBuffer = new Uint8Array(plaintext);
        if (plaintextBuffer.byteLength < 2) throw new Error('The plaintext is expected to contain at least the padding bytes.');

        var paddingLength = plaintextBuffer[0] << 8 | plaintextBuffer[1];
        if (plaintextBuffer.byteLength < 2 + paddingLength) throw new Error('The plaintext does not contain enough data for the message\'s padding.');

        for (var i = 2; i < paddingLength + 2; ++i) {
          if (plaintextBuffer[i] != 0) throw new Error('The padding must only contain NULL-bytes.');
        }

        return plaintextBuffer.slice(2);
      });
    }

    // Encrypts |plaintext|, which must either be a string or an ArrayBuffer. The |salt| must be an
    // ArrayBuffer containing sixteen bytes of information. Optionally, up to 65535 bytes of padding
    // can be added by padding an |paddingBytes| argument. A promise will be returned that will be
    // resolved with an ArrayBuffer when the encryption operation has completed.

  }, {
    key: 'encrypt',
    value: function encrypt(salt, plaintext, paddingBytes) {
      var _this2 = this;

      paddingBytes = paddingBytes || 0;

      return Promise.resolve().then(function () {
        if (!(plaintext instanceof ArrayBuffer)) plaintext = utf8Encode(plaintext);

        if (paddingBytes < 0 || paddingBytes > 65535) throw new Error('The paddingBytes must be between 0 and 65535 (inclusive).');

        return _this2.deriveEncryptionKeys(salt);
      }).then(function (_ref3) {
        var _ref4 = _slicedToArray(_ref3, 2);

        var contentEncryptionKey = _ref4[0];
        var nonce = _ref4[1];

        var record = new Uint8Array(2 + paddingBytes + plaintext.byteLength);
        record.set([paddingBytes >> 8, paddingBytes & 0xFF]);
        record.fill(0, 2 /* sizeof(uint16_t) */, 2 + paddingBytes);
        record.set(new Uint8Array(plaintext), 2 + paddingBytes);

        var algorithm = { name: 'AES-GCM', tagLength: 128, iv: nonce };

        return crypto.subtle.encrypt(algorithm, contentEncryptionKey, record);
      });
    }

    // Derives the encryption keys to be used for this cryptographer. The returned promise will be
    // resolved with the {contentEncryptionKey, nonce, nonceInfo, cekInfo, IKM, PRK}. Note that only
    // the CEK and nonce will be used by this class, the rest is exposed for debugging purposes.

  }, {
    key: 'deriveEncryptionKeys',
    value: function deriveEncryptionKeys(salt) {
      var _this3 = this;

      return Promise.resolve().then(function () {
        if (!(salt instanceof ArrayBuffer) && !(salt instanceof Uint8Array)) throw new Error('The salt is expected to be an ArrayBuffer.');

        if (salt.byteLength != SALT_BYTES) throw new Error('The salt is expected to be ' + SALT_BYTES + ' bytes.');

        salt = new Uint8Array(salt);

        return Promise.all([_this3.senderKeys_.deriveSharedSecret(_this3.receiverKeys_), _this3.senderKeys_.exportPublicKey(), _this3.receiverKeys_.exportPublicKey()]);
      }).then(function (_ref5) {
        var _ref6 = _slicedToArray(_ref5, 3);

        var ikm = _ref6[0];
        var senderPublic = _ref6[1];
        var receiverPublic = _ref6[2];

        // Info to use when extracting from the IKM and authentication secret HKDF.
        var authInfo = utf8Encode('Content-Encoding: auth\0');

        // Infos to use when extracting from the PRK and message salt HKDF.
        var contentEncryptionKeyInfo = _this3.deriveInfo('aesgcm', senderPublic, receiverPublic);
        var nonceInfo = _this3.deriveInfo('nonce', senderPublic, receiverPublic);

        // The first HKDF is fixed between the sender and receiver, whereas the second, per-message
        // HKDF incorporates the salt that is expected to be unique per message.
        var hkdf = new HKDF(ikm, _this3.authSecret_);
        return hkdf.extract(authInfo, 32).then(function (prk) {
          var messageHkdf = new HKDF(prk, salt);

          return Promise.all([messageHkdf.extract(contentEncryptionKeyInfo, 16).then(function (bits) {
            return crypto.subtle.importKey('raw', bits, 'AES-GCM', true /* extractable */, ['decrypt', 'encrypt']);
          }), messageHkdf.extract(nonceInfo, 12), contentEncryptionKeyInfo, nonceInfo, ikm, prk]);
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

  }, {
    key: 'deriveInfo',
    value: function deriveInfo(contentEncoding, senderPublic, receiverPublic) {
      var label = utf8Encode('P-256'); // always set to P-256

      var buffer = new Uint8Array(18 + contentEncoding.length + 1 + label.length + 1 + 2 * (2 + 65));
      var offset = 0;

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
  }]);

  return WebPushCryptographerDraft03;
}(WebPushCryptographer);

module.exports = WebPushCryptographerDraft03;

},{"./cryptographer":2,"./hkdf":5}],4:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

var HKDF = require('./hkdf');
var WebPushCryptographer = require('./cryptographer');

// Utility function for UTF-8 encoding a string to an ArrayBuffer.
var utf8Encode = TextEncoder.prototype.encode.bind(new TextEncoder('utf-8'));

// Length, in bytes, of the salt that should be used for the message.
var SALT_BYTES = 16;

// Implementation of the WebPushCryptographer following draft -08.

var WebPushCryptographerDraft08 = function (_WebPushCryptographer) {
  _inherits(WebPushCryptographerDraft08, _WebPushCryptographer);

  function WebPushCryptographerDraft08() {
    _classCallCheck(this, WebPushCryptographerDraft08);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(WebPushCryptographerDraft08).apply(this, arguments));
  }

  _createClass(WebPushCryptographerDraft08, [{
    key: 'decrypt',
    value: function decrypt(salt, ciphertext) {}

    // Encrypts |plaintext|, which must either be a string or an ArrayBuffer. The |salt| must be an
    // ArrayBuffer containing sixteen bytes of information. A promise will be returned that will be
    // resolved with an ArrayBuffer when the encryption operation has completed.

  }, {
    key: 'encrypt',
    value: function encrypt(salt, plaintext, paddingBytes) {
      paddingBytes = paddingBytes || 0;

      if (!(plaintext instanceof ArrayBuffer)) plaintext = utf8Encode(plaintext);

      return this.deriveEncryptionKeys(salt).then(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var contentEncryptionKey = _ref2[0];
        var nonce = _ref2[1];

        var record = new Uint8Array(plaintext.byteLength + 1 + paddingBytes);
        record.set(new Uint8Array(plaintext));
        record.set([0x02], plaintext.byteLength);

        if (paddingBytes) record.fill(0x00, plaintext.byteLength + 1);

        var algorithm = { name: 'AES-GCM', tagLength: 128, iv: nonce };

        return crypto.subtle.encrypt(algorithm, contentEncryptionKey, record);
      });
    }

    // Derives the encryption keys to be used for this cryptographer. The returned promise will be
    // resolved with the {contentEncryptionKey, nonce, nonceInfo, cekInfo, IKM, PRK}. Note that only
    // the CEK and nonce will be used by this class, the rest is exposed for debugging purposes.

  }, {
    key: 'deriveEncryptionKeys',
    value: function deriveEncryptionKeys(salt) {
      var _this2 = this;

      return Promise.resolve().then(function () {
        if (!(salt instanceof ArrayBuffer) && !(salt instanceof Uint8Array)) throw new Error('The salt is expected to be an ArrayBuffer.');

        if (salt.byteLength != SALT_BYTES) throw new Error('The salt is expected to be ' + SALT_BYTES + ' bytes.');

        salt = new Uint8Array(salt);

        return Promise.all([_this2.senderKeys_.deriveSharedSecret(_this2.receiverKeys_), _this2.senderKeys_.exportPublicKey(), _this2.receiverKeys_.exportPublicKey()]);
      }).then(function (_ref3) {
        var _ref4 = _slicedToArray(_ref3, 3);

        var sharedSecret = _ref4[0];
        var senderPublic = _ref4[1];
        var receiverPublic = _ref4[2];


        // Info to use when computing the IKM.
        var keyInfo = _this2.deriveInfo(senderPublic, receiverPublic);

        // Infos to use when computing the content encryption key and the nonce.
        var cekInfo = utf8Encode('Content-Encoding: aes128gcm\0');
        var nonceInfo = utf8Encode('Content-Encoding: nonce\0');

        // The first HKDF is fixed between the sender and receiver, whereas the second, per-message
        // HKDF incorporates the salt that is expected to be unique per message.
        var hkdf = new HKDF(sharedSecret, _this2.authSecret_);
        return hkdf.extract(keyInfo, 32).then(function (ikm) {
          var messageHkdf = new HKDF(ikm, salt);

          return Promise.all([messageHkdf.extract(cekInfo, 16).then(function (bits) {
            return crypto.subtle.importKey('raw', bits, 'AES-GCM', true /* extractable */, ['decrypt', 'encrypt']);
          }), messageHkdf.extract(nonceInfo, 12), cekInfo, nonceInfo, sharedSecret, ikm]);
        });
      });
    }

    // Computes the key info used to derive the IKM from the PRK. Includes the public keys of both the
    // sender and the receiver of the message.

  }, {
    key: 'deriveInfo',
    value: function deriveInfo(senderPublic, receiverPublic) {
      var buffer = new Uint8Array(14 + 2 * 65);
      var offset = 0;

      buffer.set(utf8Encode('WebPush: info\0'));
      offset += 14;

      if (receiverPublic.byteLength != 65) throw new Error('The receiver\'s public key must be 65 bytes in size.');

      buffer.set(receiverPublic, offset);
      offset += receiverPublic.byteLength;

      if (senderPublic.byteLength != 65) throw new Error('The sender\'s public key must be 65 bytes in size.');

      buffer.set(senderPublic, offset);

      return buffer;
    }
  }]);

  return WebPushCryptographerDraft08;
}(WebPushCryptographer);

module.exports = WebPushCryptographerDraft08;

},{"./cryptographer":2,"./hkdf":5}],5:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

var HMAC = require('./hmac');

// TODO: Document the HKDF class.
// TODO: Add input validation to the HKDF class.

var HKDF = function () {
  function HKDF(ikm, salt) {
    _classCallCheck(this, HKDF);

    var hmac = new HMAC(salt);

    this.extractPromise_ = hmac.sign(ikm).then(function (prk) {
      return new HMAC(prk);
    });
  }

  _createClass(HKDF, [{
    key: 'extract',
    value: function extract(rawInfo, byteLength) {
      var info = new Uint8Array(rawInfo.byteLength + 1);
      info.set(rawInfo);
      info.set([1], rawInfo.length);

      return this.extractPromise_.then(function (prkHmac) {
        return prkHmac.sign(info);
      }).then(function (hash) {
        return hash.slice(0, byteLength);
      });
    }
  }]);

  return HKDF;
}();

;

module.exports = HKDF;

},{"./hmac":6}],6:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// TODO: Document the HMAC class.
// TODO: Add input validation to the HMAC class.

var HMAC = function () {
  function HMAC(ikm) {
    _classCallCheck(this, HMAC);

    this.signPromise_ = crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false /* extractable */, ['sign']);
  }

  _createClass(HMAC, [{
    key: 'sign',
    value: function sign(input) {
      return this.signPromise_.then(function (key) {
        return crypto.subtle.sign('HMAC', key, input);
      });
    }
  }]);

  return HMAC;
}();

;

module.exports = HMAC;

},{}],7:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

var base64UrlToUint8Array = require('./util').base64UrlToUint8Array;
var uint8ArrayToBase64Url = require('./util').uint8ArrayToBase64Url;

// Length, in bytes, of a P-256 field element. Expected format of the private key.
var PRIVATE_KEY_BYTES = 32;

// Length, in bytes, of a P-256 public key in uncompressed EC form per SEC 2.3.3. This sequence must
// start with 0x04. Expected format of the public key.
var PUBLIC_KEY_BYTES = 65;

// Class representing a NIST P-256 Key Pair. A private/public key-pair can be generated by calling
// the KeyPair.generate() method, or a key-pair (in which the private key is optional) can be
// imported by calling KeyPair.import().
//
// The implementation converts to and from JWK at various places to work around the fact that
// working with raw ECDH keying material is not commonly available in Web browsers.

var KeyPair = function () {
  function KeyPair(publicKey, privateKey) {
    _classCallCheck(this, KeyPair);

    this.publicKey_ = publicKey;
    this.privateKey_ = privateKey;
  }

  // Returns a promise with the P-256 KeyPair instance that will resolve when it has been generated.


  _createClass(KeyPair, [{
    key: 'deriveSharedSecret',


    // Returns a promise that will be resolved with an ArrayBuffer containing the 32-byte shared
    // secret between |this| and |peerKeyPair|. |this| must have both the public and private key set,
    // whereas only the public key is required for |peerKeyPair|.
    value: function deriveSharedSecret(peerKeyPair) {
      var _this = this;

      return Promise.resolve().then(function () {
        if (!_this.privateKey_) throw new Error('The private key must be known when deriving the shared secret.');

        if (!(peerKeyPair instanceof KeyPair)) throw new Error('The peerKeyPair must be a KeyPair instance.');

        var algorithm = { name: 'ECDH', namedCurve: 'P-256', public: peerKeyPair.publicKey };

        return crypto.subtle.deriveBits(algorithm, _this.privateKey_, 256);
      });
    }

    // Gets the CryptoKey containing the public key of this key pair.

  }, {
    key: 'exportPublicKey',


    // Returns a promise that will be resolved with an ArrayBuffer containing the pair's public key in
    // uncompressed EC form, a 65-byte sequence containing two P-256 field elements.
    value: function exportPublicKey() {
      return crypto.subtle.exportKey('jwk', this.publicKey_).then(function (jwk) {
        var x = base64UrlToUint8Array(jwk.x);
        var y = base64UrlToUint8Array(jwk.y);

        var publicKey = new Uint8Array(65);
        publicKey.set([0x04], 0);
        publicKey.set(x, 1);
        publicKey.set(y, 33);

        return publicKey;
      });
    }

    // Gets the CryptoKey containing the private key of this key pair.

  }, {
    key: 'exportPrivateKey',


    // Returns a promise that will be resolved with an ArrayBuffer containing the pair's private key,
    // which is a 32-byte long P-256 field element.
    value: function exportPrivateKey() {
      return crypto.subtle.exportKey('jwk', this.privateKey_).then(function (jwk) {
        return base64UrlToUint8Array(jwk.d);
      });
    }
  }, {
    key: 'publicKey',
    get: function get() {
      return this.publicKey_;
    }
  }, {
    key: 'privateKey',
    get: function get() {
      return this.privateKey_;
    }
  }], [{
    key: 'generate',
    value: function generate() {
      return Promise.resolve().then(function () {
        return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true /* extractable */, ['deriveBits']);
      }).then(function (keys) {
        return new KeyPair(keys.publicKey, keys.privateKey);
      });
    }

    // Returns a promise with the P-256 KeyPair instance that will resolve when the |publicKey| and,
    // when given, the |privateKey| have been verified and imported. Both |publicKey| and |privateKey|
    // are expected to be ArrayBuffers, wherein |publicKey| contains the 65-byte uncompressed EC
    // points and the |privateKey| contains the 32-byte private value.

  }, {
    key: 'import',
    value: function _import(publicKey, privateKey) {
      return Promise.resolve().then(function () {
        if (!(publicKey instanceof ArrayBuffer) && !(publicKey instanceof Uint8Array)) throw new Error('The publicKey is expected to be an ArrayBuffer.');

        if (publicKey.byteLength != PUBLIC_KEY_BYTES) throw new Error('The publicKey is expected to be ' + PUBLIC_KEY_BYTES + ' bytes.');

        var publicBuffer = new Uint8Array(publicKey);
        if (publicBuffer[0] != 0x04) throw new Error('The publicKey is expected to start with an 0x04 byte.');

        var jwk = {
          kty: 'EC',
          crv: 'P-256',
          x: uint8ArrayToBase64Url(publicBuffer, 1, 33),
          y: uint8ArrayToBase64Url(publicBuffer, 33, 65),
          ext: true
        };

        var privatePromise = Promise.resolve(null);
        var publicPromise = crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true /* extractable */, []);

        if (privateKey) {
          if (!(privateKey instanceof ArrayBuffer) && !(privateKey instanceof Uint8Array)) throw new Error('The privateKey is expected to be an ArrayBuffer.');

          if (privateKey.byteLength != PRIVATE_KEY_BYTES) {
            throw new Error('The privateKey is expected to be ' + PRIVATE_KEY_BYTES + ' bytes.');
          }

          jwk.d = uint8ArrayToBase64Url(new Uint8Array(privateKey));

          privatePromise = crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true /* extractable */, ['deriveBits']);
        }

        return Promise.all([publicPromise, privatePromise]);
      }).then(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var publicKey = _ref2[0];
        var privateKey = _ref2[1];
        return new KeyPair(publicKey, privateKey);
      });
    }
  }]);

  return KeyPair;
}();

;

module.exports = KeyPair;

},{"./util":8}],8:[function(require,module,exports){
'use strict';

// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Converts the |uint8Array| to an URL-safe base64 encoded string. When provided, |start| and |end|
// indicate the range within the |uint8Array| that should be converted.
function uint8ArrayToBase64Url(uint8Array, start, end) {
  start = start || 0;
  end = end || uint8Array.byteLength;

  var base64 = btoa(String.fromCharCode.apply(null, uint8Array.slice(start, end)));
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// Converts the URL-safe base64 encoded |base64UrlData| to an Uint8Array buffer.
function base64UrlToUint8Array(base64UrlData) {
  var padding = '='.repeat((4 - base64UrlData.length % 4) % 4);
  var base64 = (base64UrlData + padding).replace(/\-/g, '+').replace(/_/g, '/');

  var rawData = atob(base64);
  var buffer = new Uint8Array(rawData.length);

  for (var i = 0; i < rawData.length; ++i) {
    buffer[i] = rawData.charCodeAt(i);
  }return buffer;
}

module.exports = { uint8ArrayToBase64Url: uint8ArrayToBase64Url, base64UrlToUint8Array: base64UrlToUint8Array };

},{}]},{},[1]);

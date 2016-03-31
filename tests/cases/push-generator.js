// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

function toBase64Url(arrayBuffer, start, end) {
  start = start || 0;
  end = end || arrayBuffer.byteLength;

  var partialBuffer = new Uint8Array(arrayBuffer.slice(start, end));
  var base64 = btoa(String.fromCharCode.apply(null, partialBuffer));
  return base64.replace(/=/g, '')
               .replace(/\+/g, '-')
               .replace(/\//g, '_');
}

// -------------------------------------------------------------------------------------------------

function SubscriptionGenerator() {}

// Manifest that contains the 'gcm_sender_id' property for GCM authentication.
SubscriptionGenerator.MANIFEST_FILE = '/push-generator/push-generator-gcm-manifest.json';

// Public NIST P-256 key in uncompressed format. Must be paired with the private key on the server.
SubscriptionGenerator.PUBLIC_KEY = [
  0x04, 0x86, 0x23, 0xC1, 0x85, 0xF0, 0x6C, 0x5D, 0x55, 0x1A, 0xD9, 0x19, 0xAA, 0xE9, 0x02, 0x2F,
  0x43, 0x55, 0xD2, 0x5C, 0x59, 0x86, 0x69, 0x90, 0xAD, 0xF7, 0x2D, 0xD4, 0x22, 0xD8, 0x63, 0xB6,
  0xCD, 0xEF, 0x33, 0xB1, 0xBB, 0x66, 0x2F, 0x47, 0xE5, 0xE6, 0x20, 0xFF, 0x0E, 0x10, 0x7F, 0xCD,
  0xA3, 0x4F, 0x8C, 0x65, 0xF4, 0x64, 0x7E, 0x2C, 0xF3, 0x6B, 0xF8, 0x7C, 0x4B, 0x0C, 0xBD, 0xBF,
  0xFE
];

// Creates a <link> element having the 'gcm_sender_id' property and adds it to the DOM.
SubscriptionGenerator.prototype.createManifest = function() {
  var manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = SubscriptionGenerator.MANIFEST_FILE;

  document.querySelector('head').appendChild(manifestLink);
};

// Removes the manifest having the 'gcm_sender_id' from the DOM if it exists.
SubscriptionGenerator.prototype.removeManifest = function() {
  var currentManifest = document.querySelector('link[rel="manifest"]');
  if (currentManifest)
    currentManifest.parentNode.removeChild(currentManifest);
};

// Returns a promise that will be resolved with the current subscription if it exists, or null when
// it doesn't. Won't be rejected unless a storage error occurs.
SubscriptionGenerator.prototype.getSubscription = function() {
  return navigator.serviceWorker.ready.then(function(registration) {
    return registration.pushManager.getSubscription();

  }).then(function(subscription) {
    // If you're reading this for inspiration on how to subscribe for push - you probably want to
    // JSON.stringify(subscription) rather than using the getKey() method manually!
    return {
      endpoint: subscription.endpoint,
      p256dh: subscription.getKey('p256dh'),
      auth: subscription.getKey('auth')
    };
  });
};

// Subscribes from a |source|, which must be one of { 'document', 'service-worker' }, authenticating
// with the push service using |authentication|, which must be one of { 'public-key', 'sender-id',
// 'none' }. The |userVisibleOnly| contract may optionally be set. Returns a promise that will be
// resolved with the subscription once this has completed.
SubscriptionGenerator.prototype.subscribe = function(authentication, source, userVisibleOnly) {
  var subscriptionOptions = {};

  this.removeManifest();

  switch (authentication) {
    case 'public-key':
      subscriptionOptions.applicationServerKey = SubscriptionGenerator.PUBLIC_KEY;
      break;
    case 'sender-id':
      this.createManifest();
      break;
    case 'none':
      // Nothing to do, since no information has to be provided.
      break;
    default:
      return Promise.reject(new Error('Invalid authentication: ' + authentication));
  }

  if (userVisibleOnly)
    subscriptionOptions.userVisibleOnly = true;

  switch (source) {
    case 'document':
      return this.subscribeFromDocument(subscriptionOptions);
    case 'service-worker':
      return this.subscribeFromWorker(subscriptionOptions);
    default:
      return Promise.reject(new Error('Invalid source: ' + source));
  }
};

// Subscribes for push using |subscriptionOptions| from the document. Returns a promise that will be
// resolved with the subscription when this has been completed.
SubscriptionGenerator.prototype.subscribeFromDocument = function(subscriptionOptions) {
  return navigator.serviceWorker.ready.then(function(registration) {
    if (subscriptionOptions.hasOwnProperty('applicationServerKey')) {
      subscriptionOptions.applicationServerKey =
          new Uint8Array(subscriptionOptions.applicationServerKey);
    }

    return registration.pushManager.subscribe(subscriptionOptions);
  });
};

// Subscribes for push using |subscriptionOptions| from the Service Worker. Returns a promise that
// will be resolved with the subscription when this has completed.
SubscriptionGenerator.prototype.subscribeFromWorker = function(subscriptionOptions) {
  var self = this;

  return new Promise(function(resolve, reject) {
    if (!navigator.serviceWorker.controller) {
      reject(new Error('Subscribing from a Service Worker requires a controlled page. Refresh?'));
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      command: 'subscribe',
      subscriptionOptions: subscriptionOptions
    });

    var messageListenerFunction = function(event) {
      navigator.serviceWorker.removeEventListener('message', messageListenerFunction);
      switch (event.data.command) {
        case 'subscribe-success':
          resolve(self.getSubscription());
          break;
        case 'subscribe-failure':
          reject(new Error('Subscription failed: ' + event.data.message));
          break;
        default:
          reject(new Error('Invalid command: ' + event.data.command));
          break;
      }
    };

    navigator.serviceWorker.addEventListener('message', messageListenerFunction);
  });
};

// Unsubscribes any existing push subscription from the |source|, which must be either 'document' or
// 'service-worker'. Returns a promise that will be resolved when unsubscription has finished.
SubscriptionGenerator.prototype.unsubscribe = function(source) {
  switch (source) {
    case 'document':
      return this.unsubscribeFromDocument();
    case 'service-worker':
      return this.unsubscribeFromWorker();
    default:
      return Promise.reject(new Error('Invalid source: ' + source));
  }
};

// Unsubscribes any existing push subscription from the document. Returns a promise that will be
// resolved when unsubscription has finished.
SubscriptionGenerator.prototype.unsubscribeFromDocument = function() {
  return navigator.serviceWorker.ready.then(function(registration) {
    return registration.pushManager.getSubscription();

  }).then(function(subscription) {
    if (subscription)
      return subscription.unsubscribe();
  });
};

// Unsubscribes any existing push subscription from the Service Worker. Returns a promise that will
// be resolved when unsubscription has finished.
SubscriptionGenerator.prototype.unsubscribeFromWorker = function() {
  return new Promise(function(resolve, reject) {
    if (!navigator.serviceWorker.controller) {
      reject(new Error('Unsubscribing from a Service Worker requires a controlled page. Refresh?'));
      return;
    }

    navigator.serviceWorker.controller.postMessage({ command: 'unsubscribe' });

    var messageListenerFunction = function(event) {
      navigator.serviceWorker.removeEventListener('message', messageListenerFunction);
      switch (event.data.command) {
        case 'unsubscribe-success':
          resolve();
          break;
        case 'unsubscribe-failure':
          reject(new Error('Unsubscription failed: ' + event.data.message));
          break;
        default:
          reject(new Error('Invalid command: ' + event.data.command));
          break;
      }
    };

    navigator.serviceWorker.addEventListener('message', messageListenerFunction);
  });
};

// -------------------------------------------------------------------------------------------------

function PushGenerator(requirementsElement, element) {
  NotificationGeneratorBase.call(
      this, requirementsElement, element, 'push-generator-sw.js');

  // The generator assumes that the user's browser supports subscription payloads.
  if (!PushSubscription.prototype.hasOwnProperty('getKey')) {
    this.addRequirement(PushGenerator.REQUIREMENT_MODERN_BROWSER,
                        'Requires a browser that supports push messaging payloads.');
  }

  // Class responsible for managing subscriptions with the push service.
  this.subscriptionGenerator_ = new SubscriptionGenerator();

  // Element that can be displayed when an asynchronous operation is in progress.
  this.spinnerElement_ = document.getElementById('spinner');

  this.unsubscribeElement_ = null;
  this.subscribeElement_ = null;
  this.displayElement_ = null;
  this.sendElement_ = null;

  this.addSubscriptionRequirement();
}

PushGenerator.REQUIREMENT_SUBSCRIPTION = 0;
PushGenerator.REQUIREMENT_MODERN_BROWSER = 1;


PushGenerator.MESSAGE_TARGET = '/push-generator/send-message.php';

PushGenerator.prototype = Object.create(NotificationGeneratorBase.prototype);

// Creates the loading spinner for the Subscription Options section of the page.
PushGenerator.prototype.createSubscriptionSpinner = function() {
  if (this.spinnerElement_)
    this.spinnerElement_.style.visibility = 'visible';
};

// Removes the loading spinner for the Subscription Options section of the page.
PushGenerator.prototype.removeSubscriptionSpinner = function() {
  if (this.spinnerElement_)
    this.spinnerElement_.style.visibility = 'hidden';
};

// Reads the values from the Subscription Options section in the form and uses the subscription
// generator to actually subscribe for push messaging.
PushGenerator.prototype.subscribe = function() {
  var state = this.computeState(true /* includeDefault */),
      self = this;

  var authentication = this.getField(state, 'authentication', 'public-key');
  var source = this.getField(state, 'source', 'document');
  var userVisibleOnly = !!this.getField(state, 'userVisibleOnly', true);

  this.createSubscriptionSpinner();

  var request = this.subscriptionGenerator_.subscribe(authentication, source, userVisibleOnly);
  request.then(function(subscription) {
    self.updateActionState();
    document.location.hash =
        self.serialize(self.computeState(false /* includeDefault */));

  }).catch(function(error) {
    self.subscribeElement_.disabled = false;

    alert('Unable to subscribe: ' + error);

  }).then(this.removeSubscriptionSpinner.bind(this));
};

// Unsubscribes any existing push subscription from the push service.
PushGenerator.prototype.unsubscribe = function() {
  var state = this.computeState(true /* includeDefault */),
      self = this;

  var source = this.getField(state, 'source', 'document');

  this.createSubscriptionSpinner();

  this.subscriptionGenerator_.unsubscribe(source).then(function() {
    self.updateActionState();

  }).catch(function(error) {
    alert('Unable to unsubscribe: ' + error);

  }).then(this.removeSubscriptionSpinner.bind(this));
};

// Displays a dialog box with information about the subscription available to the user.
PushGenerator.prototype.displaySubscription = function() {
  return this.subscriptionGenerator_.getSubscription().then(function(subscription) {
    var content = document.getElementById('subscription-info-dialog').cloneNode(true /* deep */);

    content.querySelector('#endpoint').textContent = subscription.endpoint;
    content.querySelector('#p256dh').textContent = toBase64Url(subscription.p256dh);
    content.querySelector('#auth').textContent = toBase64Url(subscription.auth);

    return DisplayDialog(content);
  });
};

PushGenerator.prototype.sendMessage = function() {
  var self = this;

  this.sendElement_.disabled = true;
  this.createMessage().then(function(message) {
    if (!message)
      return;  // an error message may already have been displayed.

    var endpoint = message.endpoint;
    if (endpoint.startsWith('https://android.googleapis.com/gcm/send/'))
      endpoint = 'https://jmt17.google.com/gcm/demo-webpush-00/' + endpoint.substr(40);

    var headers = message.headers;
    headers['X-Endpoint'] = endpoint;

    return fetch('/push.php', {
      method: 'post',
      headers: headers,
      body: message.body
    });

  }).then(function(response) {
    if (!response.ok) {
      console.warn(response);
      response.text().then(function(text) { console.warn(text); });

      throw new Error('The server was unable to POST the push message.');
    }

  }).catch(function(error) {
    alert('Unable to send a message: ' + error);

  }).then(function() {
    self.sendElement_.disabled = false;
    document.location.hash =
        self.serialize(self.computeState(false /* includeDefault */));

  });
};

PushGenerator.prototype.displayMessage = function() {
  var self = this;

  this.displayMsgElement_.disabled = true;
  this.createMessage().then(function(message) {
    if (!message)
      return;  // an error message may already have been displayed.

    var content = document.getElementById('message-info-dialog').cloneNode(true /* deep */),
        headers = [];

    Object.keys(message.headers).forEach(function(headerName) {
      headers.push(headerName + ': '  + message.headers[headerName]);
    });

    content.querySelector('#endpoint').textContent = message.endpoint;
    content.querySelector('#headers').innerHTML = headers.join('<br />');
    content.querySelector('#body').textContent = btoa(message.body);

    DisplayDialog(content);

  }).catch(function(error) {
    alert('Unable to send a message: ' + error);

  }).then(function() {
    self.displayMsgElement_.disabled = false;
    document.location.hash =
        self.serialize(self.computeState(false /* includeDefault */));

  });
};

PushGenerator.prototype.createMessage = function() {
  if (!this.verifyRequirements())
    return Promise.resolve(null);

  var state = this.computeState(true /* includeDefault */),
      self = this;

  return navigator.serviceWorker.ready.then(function(registration) {
    return registration.pushManager.getSubscription();

  }).then(function(subscription) {
    if (!subscription)
      throw new Error('You must be subscribed for push messages.');

    var settings = {
      protocol: self.getField(state, 'protocol', 'gcm'),
      payload: self.getField(state, 'payload', 'none'),
      encryption: self.getField(state, 'encryption', 'valid')
    };

    if (settings.payload != 'none') {
      var data = JSON.parse(JSON.stringify(subscription));
      if (!data.hasOwnProperty('keys') || !data.keys.hasOwnProperty('p256dh') ||
          !data.keys.hasOwnProperty('auth')) {
        throw new Error('This implementation requires existence of the P-256 and auth keys ' +
                        'for adding payloads to a push message.');
      }
    }

    return self.doCreateMessage(subscription, settings);
  });
};

PushGenerator.prototype.doCreateMessage = function(subscription, settings) {
  var self = this;

  return this.doCreatePayload(subscription, settings).then(function(payload) {
    return {
      endpoint: self.doCreateEndpoint(subscription, settings),
      headers: self.doCreateHeaders(payload, subscription, settings),
      body: self.doCreateBody(payload, subscription, settings)
    };
  });
};

PushGenerator.prototype.doCreatePayload = function(subscription, settings) {
  if (settings.payload === 'none') {
    return Promise.resolve({ encryptionHeader: null,
                             cryptoKeyHeader: null,
                             payload: null });
  }

  var payload = 'Hello, world!',
      paddingBytes = 0;

  switch (settings.payload) {
    case 'text':
      // no padding has to be applied
      break;
    case 'text_padding':
      paddingBytes = 128;
      break;
    default:
      payload = settings.payload;
      break;
  }

  var promii = [ KeyPair.generate(), KeyPair.import(subscription.getKey('p256dh')) ];
  return Promise.all(promii).then(function(keys) {
    var cryptographer = new WebPushCryptographer(keys[0], keys[1], subscription.getKey('auth'));
    var salt = crypto.getRandomValues(new Uint8Array(16));

    var promii = [ cryptographer.encrypt(salt, payload, paddingBytes), keys[0].exportPublicKey() ];
    return Promise.all(promii).then(function(data) {
      return {
        ciphertext: data[0],
        salt: toBase64Url(salt),
        dh: toBase64Url(data[1])
      };
    });
  });
};

PushGenerator.prototype.doCreateEndpoint = function(subscription, settings) {
  // TODO: Transform for GCM when protocol != web_push
  return subscription.endpoint;
};

PushGenerator.prototype.doCreateHeaders = function(payload, subscription, settings) {
  if (settings.payload == 'none')
    return {};  // no payload headers are necessary

  return {
    'Content-Encoding': 'aesgcm128',
    'Encryption': 'salt="' + payload.salt + '"',
    'Crypto-Key': 'dh="' + payload.dh + '"'
  };
};

PushGenerator.prototype.doCreateBody = function(payload, subscription, settings) {
  if (settings.protocol == 'gcm') {
    // TODO: Create the request body for the GCM protocol.
    return '';
  }

  return payload.ciphertext;

//  return String.fromCharCode.apply(null, new Uint8Array(payload.ciphertext));
};

PushGenerator.prototype.setActionElements = function(unsubscribe, subscribe, display, send, displayMsg) {
  unsubscribe.addEventListener('click', this.__proto__.unsubscribe.bind(this));
  subscribe.addEventListener('click', this.__proto__.subscribe.bind(this));
  display.addEventListener('click', this.__proto__.displaySubscription.bind(this));
  send.addEventListener('click', this.__proto__.sendMessage.bind(this));
  displayMsg.addEventListener('click', this.__proto__.displayMessage.bind(this));


  this.unsubscribeElement_ = unsubscribe;
  this.subscribeElement_ = subscribe;
  this.displayElement_ = display;
  this.sendElement_ = send;
  this.displayMsgElement_ = displayMsg;

  this.updateActionState();
};

PushGenerator.prototype.updateActionState = function() {
  var result = new Promise(function(resolve, reject) {
    navigator.serviceWorker.ready.then(function(registration) {
      if (!registration) {
        reject();
        return;
      }

      registration.pushManager.getSubscription().then(function(subscription) {
        subscription ? resolve() : reject();

      }, function(error) { reject(); });
    }).catch(function() { reject(); });
  });

  var self = this;
  result.then(function() {
    // |result| resolved - there is an existing push subscription.
    self.unsubscribeElement_.disabled = false;
    self.subscribeElement_.disabled = true;
    self.displayElement_.disabled = false;
    self.sendElement_.disabled = false;
    self.displayMsgElement_.disabled = false;

    self.satisfyRequirement(PushGenerator.REQUIREMENT_SUBSCRIPTION);

  }, function() {
    // |result| rejected - there is no push subscription.
    self.unsubscribeElement_.disabled = true;
    self.subscribeElement_.disabled = false;
    self.displayElement_.disabled = true;
    self.sendElement_.disabled = true;
    self.displayMsgElement_.disabled = true;

    self.addSubscriptionRequirement();
  });
};

PushGenerator.prototype.addSubscriptionRequirement = function() {
  this.addRequirement(PushGenerator.REQUIREMENT_SUBSCRIPTION,
                      'Requires a valid push messaging subscription.');
};

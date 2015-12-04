// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

function PushGenerator(requirementsElement, element) {
  NotificationGeneratorBase.call(
      this, requirementsElement, element, 'push-generator-sw.js');

  this.unsubscribeElement_ = null;
  this.subscribeElement_ = null;
  this.displayElement_ = null;
  this.sendElement_ = null;

  this.addSubscriptionRequirement();
}

PushGenerator.REQUIREMENT_SUBSCRIPTION = 0;

PushGenerator.GCM_MANIFEST_FILE = '/push-generator/push-generator-gcm-manifest.json';
PushGenerator.MESSAGE_TARGET = '/push-generator/send-message.php';

PushGenerator.prototype = Object.create(NotificationGeneratorBase.prototype);

PushGenerator.prototype.unsubscribe = function() {
  var self = this;

  navigator.serviceWorker.ready.then(function(registration) {
    return registration.pushManager.getSubscription();

  }).then(function(subscription) {
    if (subscription)
      return subscription.unsubscribe();

  }).then(function() {
    self.updateActionState();

  }).catch(function(error) {
    alert('Unable to unsubscribe: ' + error);

  });
};

PushGenerator.prototype.subscribe = function() {
  var state = this.computeState(true /* includeDefault */),
      self = this;

  var settings = {
    authentication: this.getField(state, 'authentication', 'manifest'),
    source: this.getField(state, 'source', 'document'),
    userVisibleOnly: this.getField(state, 'userVisibleOnly', true)
  };

  this.subscribeElement_.disabled = true;
  this.doSubscribe(settings).then(function() {
    self.updateActionState();

    document.location.hash =
        self.serialize(self.computeState(false /* includeDefault */));

  }).catch(function(error) {
    self.subscribeElement_.disabled = false;
    alert(error);
  });
};

PushGenerator.prototype.doSubscribe = function(settings) {
  if (settings.source == 'sw')
    return this.doSubscribeFromServiceWorker(settings);

  switch (settings.authentication) {
    case 'manifest':
      var currentManifest = document.querySelector('link[rel="manifest"]');
      if (currentManifest)
        currentManifest.parentNode.removeChild(currentManifest);

      var manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = PushGenerator.GCM_MANIFEST_FILE;

      document.querySelector('head').appendChild(manifestLink);
      break;
    case 'public_key':
      // TODO: Implement support for public key authentication.
      return Promise.reject('Support for public key authentication has not been implemented yet.');
    case 'none':
      // No authentication to be provided at all.
      break;
    default:
      return Promise.reject('Invalid option for |settings.authentication|: ' + settings.authentication);
  }

  return new Promise(function(resolve, reject) {
    navigator.serviceWorker.ready.then(function(registration) {
      registration.pushManager.subscribe({ userVisibleOnly: settings.userVisibleOnly })
        .then(function(subscription) {
          resolve();

        }, function(error) { reject(error);  });

    }, function(error) { reject(error); });
  });
};

PushGenerator.prototype.doSubscribeFromServiceWorker = function(settings) {
  // TODO: Implement support for subscribing from a Service Worker.
  return Promise.reject('Subscribing from a Service Worker has not been implemented yet.');
};

PushGenerator.prototype.displaySubscription = function() {
  return navigator.serviceWorker.ready.then(function(registration) {
    return registration.pushManager.getSubscription();

  }).then(function(subscription) {
    var content = document.getElementById('subscription-info-dialog').cloneNode(true /* deep */),
        data = JSON.parse(JSON.stringify(subscription));

    var endpoint = data.endpoint;
    var p256dh = '[undefined]';
    var auth = '[undefined]';

    if (data.hasOwnProperty('keys')) {
      if (data.keys.hasOwnProperty('p256dh'))
        p256dh = data.keys.p256dh;

      if (data.keys.hasOwnProperty('auth'))
        auth = data.keys.auth;
    }

    content.querySelector('#endpoint').textContent = endpoint;
    content.querySelector('#p256dh').textContent = p256dh;
    content.querySelector('#auth').textContent = auth;

    return DisplayDialog(content);
  });
};

PushGenerator.prototype.sendMessage = function() {
  var self = this;

  this.sendElement_.disabled = true;
  this.createMessage().then(function(message) {
    if (!message)
      return;  // an error message may already have been displayed.

    console.log(message);

  }).catch(function(error) {
    alert('Unable to send a message: ' + error);

  }).then(function() {
    self.sendElement_.disabled = false;
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

  }).then(function(message) {
    console.info(message);

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

  var encryptor = new WebPushEncryption();
  encryptor.setRecipientPublicKey(subscription.getKey('p256dh'));
  encryptor.setAuthenticationSecret(subscription.getKey('auth'));
  encryptor.setData('Hello!');  // TODO: Set the real input data.

  return encryptor.encrypt();

};

PushGenerator.prototype.doCreateEndpoint = function(subscription, settings) {
  // TODO: Transform for GCM when protocol != web_push
  return subscription.endpoint;
};

PushGenerator.prototype.doCreateHeaders = function(payload, subscription, settings) {
  if (settings.protocol == 'gcm') {
    // TODO: Create headers for GCM messages.
    return 'gcm';
  }

  // TODO: Create headers for Web Push messages.
  return 'webpush';
};

PushGenerator.prototype.doCreateBody = function(payload, subscription, settings) {
  return 'body';
};

PushGenerator.prototype.setActionElements = function(unsubscribe, subscribe, display, send) {
  unsubscribe.addEventListener('click', this.__proto__.unsubscribe.bind(this));
  subscribe.addEventListener('click', this.__proto__.subscribe.bind(this));
  display.addEventListener('click', this.__proto__.displaySubscription.bind(this));
  send.addEventListener('click', this.__proto__.sendMessage.bind(this));

  this.unsubscribeElement_ = unsubscribe;
  this.subscribeElement_ = subscribe;
  this.displayElement_ = display;
  this.sendElement_ = send;

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

    self.satisfyRequirement(PushGenerator.REQUIREMENT_SUBSCRIPTION);

  }, function() {
    // |result| rejected - there is no push subscription.
    self.unsubscribeElement_.disabled = true;
    self.subscribeElement_.disabled = false;
    self.displayElement_.disabled = true;
    self.sendElement_.disabled = true;

    self.addSubscriptionRequirement();
  });
};

PushGenerator.prototype.addSubscriptionRequirement = function() {
  this.addRequirement(PushGenerator.REQUIREMENT_SUBSCRIPTION,
                      'Requires a valid push messaging subscription.');
};

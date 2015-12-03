// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

function PushGenerator(requirementsElement, element) {
  NotificationGeneratorBase.call(
      this, requirementsElement, element, 'push-generator-sw.js');

  this.unsubscribeElement_ = null;
  this.subscribeElement_ = null;
  this.displayElement_ = null;

  this.addSubscriptionRequirement();
}

PushGenerator.REQUIREMENT_SUBSCRIPTION = 0;

PushGenerator.GCM_MANIFEST_FILE = '/push-generator/push-generator-gcm-manifest.json';

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

  this.doSubscribe(settings).then(function() {
    self.updateActionState();

    document.location.hash =
        self.serialize(self.computeState(false /* includeDefault */));

  }, function(error) { alert(error); });
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
    var p256dh = '[unknown]';
    var auth = '[unknown]';

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

PushGenerator.prototype.setActionElements = function(unsubscribe, subscribe, display) {
  unsubscribe.addEventListener('click', this.__proto__.unsubscribe.bind(this));
  subscribe.addEventListener('click', this.__proto__.subscribe.bind(this));
  display.addEventListener('click', this.__proto__.displaySubscription.bind(this));

  this.unsubscribeElement_ = unsubscribe;
  this.subscribeElement_ = subscribe;
  this.displayElement_ = display;

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

    self.satisfyRequirement(PushGenerator.REQUIREMENT_SUBSCRIPTION);

  }, function() {
    // |result| rejected - there is no push subscription.
    self.unsubscribeElement_.disabled = true;
    self.subscribeElement_.disabled = false;
    self.displayElement_.disabled = true;

    self.addSubscriptionRequirement();
  });
};

PushGenerator.prototype.addSubscriptionRequirement = function() {
  this.addRequirement(PushGenerator.REQUIREMENT_SUBSCRIPTION,
                      'Requires a valid push messaging subscription.');
};

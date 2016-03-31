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

function MessageGenerator() {}

// Creates an encrypted message that can be distributed to the push service. The |payload| must be
// an ArrayBuffer with the message's content, whereas |padding| must be the number of bytes of
// padding to include with the message, in range of 0 - 65535. This method will return a promise
// that will be resolved with the payload and used encryption keys.
//
// The message will be encrypted following the latest version of the specification:
// https://tools.ietf.org/html/draft-ietf-webpush-encryption
MessageGenerator.prototype.createMessage = function(subscription, payload, padding) {
  return Promise.reject(new Error('Not yet implemented.'));
};

// -------------------------------------------------------------------------------------------------

function RequestGenerator() {}

// Creates the required information for a request to send |message| to the |subscription|. The
// |protocol| must be one of { 'web-push', 'gcm' }, and the |authentication| must be one of the
// following: { 'public-key', 'sender-id', 'none' }. Will return a promise that will be resolved
// with the request information when the operation has completed.
RequestGenerator.prototype.createRequest = function(subscription, message, protocol, authentication) {
  return Promise.reject(new Error('Not yet implemented.'));
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

  // Classes responsible for managing subscriptions, messages and requests with the push service.
  this.subscriptionGenerator_ = new SubscriptionGenerator();
  this.messageGenerator_ = new MessageGenerator();
  this.requestGenerator_ = new RequestGenerator();

  // Element that can be displayed when an asynchronous operation is in progress.
  this.subscriptionSpinnerElement_ = document.getElementById('subscription-spinner');
  this.requestSpinnerElement_ = document.getElementById('request-spinner');

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
  if (this.subscriptionSpinnerElement_)
    this.subscriptionSpinnerElement_.style.visibility = 'visible';
};

// Removes the loading spinner for the Subscription Options section of the page.
PushGenerator.prototype.removeSubscriptionSpinner = function() {
  if (this.subscriptionSpinnerElement_)
    this.subscriptionSpinnerElement_.style.visibility = 'hidden';
};

// Creates the loading spinner for the Message and Request setting sections of the page.
PushGenerator.prototype.createRequestSpinner = function() {
  if (this.requestSpinnerElement_)
    this.requestSpinnerElement_.style.visibility = 'visible';
};

// Removes the loading spinner for the Message and Request setting sections of the page.
PushGenerator.prototype.removeRequestSpinner = function() {
  if (this.requestSpinnerElement_)
    this.requestSpinnerElement_.style.visibility = 'hidden';
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

// Sends a message following the message and request settings to the push service, through a PHP
// wrapper script that lives on the server.
PushGenerator.prototype.sendMessage = function() {
  if (!this.verifyRequirements())
    return;

  var state = this.computeState(true /* includeDefault */);
  var delay = this.getField(state, 'delay', '0');

  this.createRequestSpinner();

  this.createRequest().then(function(request) {
    // TODO: Respect the artificial |delay|.
    // TODO: Send the created message to the push service.

  }).catch(function(error) {
    alert('Unable to create the message: ' + error);

  }).then(this.removeRequestSpinner.bind(this));
};

// Displays the message in a dialog as it would be send to the push service.
PushGenerator.prototype.displayMessage = function() {
  if (!this.verifyRequirements())
    return;

  this.createRequestSpinner();

  this.createRequest().then(function(request) {
    // TODO: Display the created message's information.

  }).catch(function(error) {
    alert('Unable to create the message: ' + error);

  }).then(this.removeRequestSpinner.bind(this));
};

// Creates the information required for the application server to be able to send a message to the
// push service. Returns a promise that will be resolved with said information once available.
PushGenerator.prototype.createRequest = function() {
  var state = this.computeState(true /* includeDefault */),
      self = this;

  // Subscription settings
  var authentication = this.getField(state, 'authentication', 'public-key');

  // Message settings
  var payload = this.getField(state, 'payload', 'text');
  var padding = parseInt(this.getField(state, 'padding', '0'), 10);

  // Request settings
  var protocol = this.getField(state, 'protocol', 'web-push');

  return this.subscriptionGenerator_.getSubscription().then(function(subscription) {
    return Promise.all([
      subscription,
      self.messageGenerator_.createMessage(subscription, payload, padding)
    ]);

  }).then(function(arguments) {
    var subscription = arguments[0];
    var message = arguments[1];

    return self.requestGenerator_.createRequest(subscription, message, protocol, authentication);
  });
};

// Sets the buttons that can be clicked on by the user in order to start a action. Will bind event
// listeners to each of the actions, mapping to methods in this class.
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

// Updates the state of the action buttons in response to a change in push subscription.
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

// Adds the need-a-subscription requirement. Will only be validated for sending and displaying
// messages, but otherwise serves as an informative message to the more savvy user.
PushGenerator.prototype.addSubscriptionRequirement = function() {
  this.addRequirement(PushGenerator.REQUIREMENT_SUBSCRIPTION,
                      'Requires a valid push messaging subscription.');
};

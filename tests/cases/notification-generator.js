// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

function NotificationGenerator(requirementsElement, element) {
  NotificationGeneratorBase.call(
      this, requirementsElement, element, 'notification-generator-sw.js');
}

NotificationGenerator.prototype = Object.create(NotificationGeneratorBase.prototype);

// Creates the NotificationOptions dictionary based on the options in the
// generator. Default values will be added where necessary.
NotificationGenerator.prototype.createNotificationOptions = function(state) {
  // Note that the default values match those in the spec:
  // https://notifications.spec.whatwg.org/#dictdef-notificationoptions
  return {
    dir: this.getField(state, 'dir', 'auto'),
    // lang
    body: this.getField(state, 'body', ''),
    tag: this.getField(state, 'tag', ''),
    icon: this.getField(state, 'icon', ''),
    // sound
    vibrate: this.getField(state, 'vibrate', undefined),
    timestamp: this.getField(state, 'timestamp', undefined),
    renotify: this.getField(state, 'renotify', false),
    actions: this.getField(state, 'actions', undefined),
    silent: this.getField(state, 'silent', false),
    // noscreen
    requireInteraction: this.getField(state, 'requireInteraction', false),
    sticky: this.getField(state, 'sticky', false),

    data: {
      options: {
        action: this.getField(state, 'action', 'default'),
        close: this.getField(state, 'close', true),

        url: document.location.toString(),
      }
    }
  };
};

// Displays the notification using the settings that have thus far been set.
// If not all requirements have been satisfied, the user will be alerted.
NotificationGenerator.prototype.display = function() {
  if (!this.verifyRequirements())
    return;

  var state = this.computeState(true /* includeDefault */);
  if (!state.hasOwnProperty('title')) {
    alert('The notification must at least have a title.');
    return;
  }

  var title = state.title.value,
      options = this.createNotificationOptions(state),
      persistent = true;

  var promise = persistent ? this.displayPersistent(title, options)
                           : this.displayNonPersistent(title, options);

  var self = this;
  return promise.then(function() {
    document.location.hash =
        self.serialize(self.computeState(false /* includeDefault */));
  });
};

// Displays a persistent notification on the active Service Worker registration,
// and returns a Promise that will be settled when the operation is complete.
NotificationGenerator.prototype.displayPersistent = function(title, options) {
  return navigator.serviceWorker.ready.then(function(serviceWorker) {
    return serviceWorker.showNotification(title, options);

  }).catch(function(exception) { alert(exception); });
};

// Displays a non-persistent notification using the Notification constructor,
// and returns a Promise that will be settled when the operation is complete.
NotificationGenerator.prototype.displayNonPersistent = function(title, options) {
  return new Promise(function(resolve) {
    var notification = null;
    try {
      notification = new Notification(title, options);
    } catch (exception) {
      alert(exception);
      return resolve();
    }

    notification.addEventListener('show', function() {
      resolve();
    });

    notification.addEventListener('error', function(error) {
      alert(error);
      resolve();
    });
  });
};

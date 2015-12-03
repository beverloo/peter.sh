// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

function NotificationGenerator(requirementsElement, element) {
  GeneratorBase.call(this, requirementsElement);

  this.element_ = element;

  this.addRequirement(NotificationGenerator.REQUIREMENT_PERMISSION,
                      'Requires permission to display notifications.');
  this.addRequirement(NotificationGenerator.REQUIREMENT_SERVICE_WORKER,
                      'Requires the Service Worker to be registered.');
}

NotificationGenerator.prototype = Object.create(GeneratorBase.prototype);

NotificationGenerator.REQUIREMENT_PERMISSION = 0;
NotificationGenerator.REQUIREMENT_SERVICE_WORKER = 1;

// Requests permission for notifications, and will mark the permission
// requirement as satisfied once this has been granted by the user.
NotificationGenerator.prototype.requestPermission = function() {
  var self = this;
  Notification.requestPermission(function(status) {
    if (status == 'granted')
      self.satisfyRequirement(NotificationGenerator.REQUIREMENT_PERMISSION);
  });
};

// Registers the generator's Service Worker for |scope|. The returned Promise
// will be resolved when the worker is in ACTIVE state.
NotificationGenerator.prototype.registerServiceWorker = function(scope) {
  navigator.serviceWorker.register(scope + 'notification-generator-sw.js',
                                   { scope: scope });

  var self = this;
  return navigator.serviceWorker.ready.then(function(serviceWorker) {
    self.satisfyRequirement(NotificationGenerator.REQUIREMENT_SERVICE_WORKER);
    return serviceWorker;
  });
};

// Creates the NotificationOptions dictionary based on the options in the
// generator. Default values will be added where necessary.
NotificationGenerator.prototype.createNotificationOptions = function(state) {
  function getField(name, defaultValue) {
    if (!state.hasOwnProperty(name))
      return defaultValue;

    switch (state[name].type) {
      case GeneratorBase.FIELD_TYPE_ARRAY:
        if (!state[name].value.length)
          return defaultValue;

        var pattern = [];
        state[name].value.split(',').forEach(function(chunk) {
          pattern.push(parseInt(chunk, 10));
        });

        return pattern;
      case GeneratorBase.FIELD_TYPE_BUTTONS:
        if (!state[name].value.length)
          return defaultValue;

        var buttons = state[name].value.split(GeneratorBase.SEPARATOR_FIELD),
            actions = [];

        for (var index = 0; index < buttons.length; ++index) {
          actions.push({
            action: index,
            title: buttons[index]
          });
        }

        return actions;
      case GeneratorBase.FIELD_TYPE_TIME_OFFSET:
        if (!state[name].value.length)
          return defaultValue;

        var currentTime = Date.now(),
            givenTime = parseInt(state[name].value);

        return currentTime + givenTime;
      case GeneratorBase.FIELD_TYPE_BOOL:
        return !!state[name].value;
      case GeneratorBase.FIELD_TYPE_STRING:
        return state[name].value;
    }

    // This should never be reached, as the switch() handles all cases.
    return defaultValue;
  }

  // Note that the default values match those in the spec:
  // https://notifications.spec.whatwg.org/#dictdef-notificationoptions
  return {
    dir: getField('dir', 'auto'),
    // lang
    body: getField('body', ''),
    tag: getField('tag', ''),
    icon: getField('icon', ''),
    // sound
    vibrate: getField('vibrate', undefined),
    timestamp: getField('timestamp', undefined),
    renotify: getField('renotify', false),
    actions: getField('actions', undefined),
    silent: getField('silent', false),
    // noscreen
    requireInteraction: getField('requireInteraction', false),
    sticky: getField('sticky', false),

    data: {
      options: {
        action: getField('action', 'default'),
        close: getField('close', true),

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

  var state = this.computeState(true /* include_default */);
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
        self.serialize(self.computeState(false /* include_default */));
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

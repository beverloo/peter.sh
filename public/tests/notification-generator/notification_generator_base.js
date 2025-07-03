// Copyright 2018 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Base class for notification generators, e.g. the Push API and the Notification
// API. Will automatically register the common requirements.
function NotificationGeneratorBase(requirementsElement, element) {
  GeneratorBase.call(this, requirementsElement, element);

  this.addRequirement(NotificationGeneratorBase.REQUIREMENT_PERMISSION,
                      'Requires permission to display notifications.');
  this.addRequirement(NotificationGeneratorBase.REQUIREMENT_SERVICE_WORKER,
                      'Requires the Service Worker to be registered.');
}

NotificationGeneratorBase.prototype = Object.create(GeneratorBase.prototype);

NotificationGeneratorBase.REQUIREMENT_PERMISSION = 1000;
NotificationGeneratorBase.REQUIREMENT_SERVICE_WORKER = 1001;

NotificationGeneratorBase.prototype.registerServiceWorker = function(scope) {
  navigator.serviceWorker.register(scope + 'sw.js', { scope: scope }).catch(function(error) {
    console.error('Unable to register the service worker: ' + error);
  });

  var self = this;
  return navigator.serviceWorker.ready.then(function(serviceWorker) {
    self.satisfyRequirement(NotificationGeneratorBase.REQUIREMENT_SERVICE_WORKER);
    return serviceWorker;
  });
};

NotificationGeneratorBase.prototype.requestPermission = function() {
  var self = this;
  Notification.requestPermission(function(status) {
    if (status == 'granted')
      self.satisfyRequirement(NotificationGeneratorBase.REQUIREMENT_PERMISSION);
  });
};

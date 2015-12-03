// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

function PushGenerator(requirementsElement) {
  GeneratorBase.call(this, requirementsElement);

  this.addRequirement(PushGenerator.REQUIREMENT_PERMISSION,
                      'Requires permission to display notifications.');
  this.addRequirement(PushGenerator.REQUIREMENT_SERVICE_WORKER,
                      'Requires the Service Worker to be registered.');
  this.addRequirement(PushGenerator.REQUIREMENT_SUBSCRIPTION,
                      'Requires a valid push messaging subscription.');
}

PushGenerator.REQUIREMENT_PERMISSION = 0;
PushGenerator.REQUIREMENT_SERVICE_WORKER = 1;
PushGenerator.REQUIREMENT_SUBSCRIPTION = 2;

PushGenerator.prototype = Object.create(GeneratorBase.prototype);

PushGenerator.prototype.registerServiceWorker = function(scope) {
  navigator.serviceWorker.register(scope + 'push-generator-sw.js', { scope: scope }).catch(function(error) {
    console.error('Unable to register the service worker: ' + error);
  });

  var self = this;
  return navigator.serviceWorker.ready.then(function(serviceWorker) {
    self.satisfyRequirement(PushGenerator.REQUIREMENT_SERVICE_WORKER);
    return serviceWorker;
  });
};

PushGenerator.prototype.requestPermission = function() {
  var self = this;
  Notification.requestPermission(function(status) {
    if (status == 'granted')
      self.satisfyRequirement(PushGenerator.REQUIREMENT_PERMISSION);
  });
};

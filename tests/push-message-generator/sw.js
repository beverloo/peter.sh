// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Distributes a message to all window clients controlled by the current Service Worker.
function sendMessageToAllClients(command, message) {
  clients.matchAll({ type: 'window' }).then(function(windowClients) {
    windowClients.forEach(function(windowClient) {
      windowClient.postMessage({ command: command, message: message || '' });
    });
  });
}

self.addEventListener('install', function(event) {
  event.waitUntil(skipWaiting());
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

// Receives commands originating from the page, for example to subscribe from the worker.
self.addEventListener('message', function(event) {
  switch (event.data.command) {
    case 'subscribe':
      var subscriptionOptions = event.data.subscriptionOptions;
      if (subscriptionOptions.hasOwnProperty('applicationServerKey')) {
        subscriptionOptions.applicationServerKey =
            new Uint8Array(subscriptionOptions.applicationServerKey);
      }

      registration.pushManager.subscribe(subscriptionOptions).then(function(subscription) {
        sendMessageToAllClients('subscribe-success');

      }).catch(function(error) {
        sendMessageToAllClients('subscribe-failure', '' + error);

      });

      break;

    case 'unsubscribe':
      registration.pushManager.getSubscription().then(function(subscription) {
        if (subscription)
          return subscription.unsubscribe();

      }).then(function() {
        sendMessageToAllClients('unsubscribe-success');

      }).catch(function(error) {
        sendMessageToAllClients('unsubscribe-failure', '' + error);

      });
  }
});

self.addEventListener('push', function(event) {
  var message = '[empty payload]';

  if (event.data)
    message = 'payload: ' + event.data.text();

  event.waitUntil(
    registration.showNotification('Push Generator', {
      body: message
    })
  );
});

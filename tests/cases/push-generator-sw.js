// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

self.addEventListener('install', function(event) {
  event.waitUntil(skipWaiting());
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
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

// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

function firstWindowClient() {
  return clients.matchAll({ type: 'window' }).then(function(windowClients) {
    return windowClients.length ? windowClients[0] : Promise.reject("No clients");
  });
}

self.addEventListener('install', function(event) {
  event.waitUntil(skipWaiting());
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

// Marks the website as being installable in Chrome.
self.addEventListener('fetch', function(event) {});

self.addEventListener('notificationclick', function(event) {
  var notification = event.notification;

  if (!notification.data.hasOwnProperty('options'))
    return;

  var options = notification.data.options;

  // Close the notification if the setting has been set to do so.

  if (options.close)
    event.notification.close();

  var promise = Promise.resolve();

  // Available settings for |options.action| are:
  //
  //    'default'      First try to focus an existing window for the URL, open a
  //                   new one if none could be found.
  //
  //    'focus-only'   Only try to focus existing windows for the URL, don't do
  //                   anything if none exists.
  //
  //    'message'      Sends a message to all clients about this notification
  //                   having been clicked, with the notification's information.
  //
  //    'open-only'    Do not try to find existing windows, always open a new
  //                   window for the given URL.
  //
  //    'open-only-*'  Always open a new window for a given URL, which is a
  //                   non-HTTP/HTTPS protocol link.
  //

  if (options.action == 'message') {
    firstWindowClient().then(function(client) {
      var message = 'Clicked on "' + notification.title + '"';
      if (event.action || event.reply) {
        message += ' (action: "' + event.action + '", reply: ';
        message += event.reply === null ? 'null' : '"' + event.reply + '"';
        message += ')';
      }
      client.postMessage(message);
    });

    return;
  }

  if (options.action == 'default' || options.action == 'focus-only') {
    promise =
        promise.then(function() { return firstWindowClient(); })
               .then(function(client) { return client.focus(); });
    if (options.action == 'default') {
      promise = promise.catch(function() { clients.openWindow(options.url); });
    }
  } else if (options.action == 'open-only-tel') {
    promise = promise.then(function() { clients.openWindow('tel:+12025550108'); });
  } else if (options.action == 'open-only-mailto') {
    promise = promise.then(function() { clients.openWindow('mailto:fake@example.com'); });
  } else if (options.action == 'open-only') {
    promise = promise.then(function() { clients.openWindow(options.url); });
  }

  event.waitUntil(promise);
});

self.addEventListener('notificationclose', function(event) {
  var notification = event.notification;
  var options = notification.data.options;

  // Available settings for |options.notificationCloseEvent| are:
  //  true: alert will be raised in the client to show the event firing.
  //  flase: no message will be sent back to the client 
  if (!options.notificationCloseEvent)
    return;

  var message = 'Closed "' + notification.title + '"';
  firstWindowClient().then(function(client) {
    client.postMessage(message);
  });
});

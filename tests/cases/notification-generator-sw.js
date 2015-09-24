// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Returns if |client| and |url| describe the same document.
function sameDocument(client, url) {
  console.log(client.url, url);
  return client.url == url;
}

self.addEventListener('notificationclick', function(event) {
  var notification = event.notification;

  if (!notification.data.hasOwnProperty('options'))
    return;

  var options = notification.data.options;

  // Close the notification if the setting has been set to do so.

  if (options.close)
    notification.close();

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

  if (options.action == 'message') {
    clients.matchAll({ type: 'window' }).then(function(windowClients) {
      windowClients.forEach(function(client) {
        if (!sameDocument(client, options.url))
          return;

        client.postMessage({
          title: notification.title,
          options: options
        });
      });
    });

    return;
  }

  if (options.action == 'default' || options.action == 'focus-only') {
    promise =
        promise.then(clients.matchAll({ type: 'window' }))
               .then(function(windowClients) {
                 windowClients.forEach(function(client) {
                   if (!sameDocument(client, options.url))
                     return;

                   client.focus();
                 });
               });
  }

  if (options.action == 'default' || options.action == 'open-only') {
    promise =
        promise.then(clients.openWindow(options.url));
  }

  event.waitUntil(promise);
});

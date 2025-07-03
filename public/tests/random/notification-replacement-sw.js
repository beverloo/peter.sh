addEventListener('install', function(event) {
  event.waitUntil(skipWaiting());
});

addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

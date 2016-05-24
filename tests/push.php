<?php
// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Responds with HTTP |$status| and outputs |$message| for additional info.
function fatalError($status, $message) {
  Header('HTTP/1.0 ' . $status); 
  echo $message;
  exit;
}

// Converts the HTTP header |$name| to the key used in $_SERVER.
function toHeaderName($name) {
  return 'HTTP_' . str_replace('-', '_', strtoupper($name));
}

// Determines if the |$endpoint| contains a whitelisted URL.
function isWhitelisted($endpoint) {
  $endpointWhitelist = [
    'https://android.googleapis.com/gcm/send',
    'https://fcm.googleapis.com/',
    'https://jmt17.google.com/',
    'https://updates.push.services.mozilla.com/push/',
    'https://updates-autopush.stage.mozaws.net',
  ];

  $filtered = array_filter($endpointWhitelist, function($entry) use ($endpoint) {
    return substr($endpoint, 0, strlen($entry)) == $entry;
  });

  return !!count($filtered);
}

// -----------------------------------------------------------------------------

if ($_SERVER['REQUEST_METHOD'] != 'POST')
  fatalError('405 Method Not Allowed', 'Only POST requests may be made to this tool.');

$requestHeaders = array_change_key_case(apache_request_headers(), CASE_LOWER);

if (!array_key_exists('x-endpoint', $requestHeaders))
  fatalError('400 Bad Request', 'The X-Endpoint HTTP header must be set.');

$endpoint = $requestHeaders['x-endpoint'];
$headers = [];

if (!isWhitelisted($endpoint))
  fatalError('403 Forbidden', 'The endpoint has not been whitelisted. Send a PR?');

$optionalHeaders = ['Authorization', 'Content-Encoding', 'Content-Type', 'Crypto-Key', 'Encryption',
                    'TTL'];

foreach ($optionalHeaders as $headerName) {
  $lowerCaseHeaderName = strtolower($headerName);

  if (array_key_exists($lowerCaseHeaderName, $requestHeaders))
    $headers[] = $headerName . ': ' . $requestHeaders[$lowerCaseHeaderName];
}

$rawData = file_get_contents('php://input');

// -----------------------------------------------------------------------------

$request = curl_init();

curl_setopt_array($request, [
  CURLOPT_URL             => $endpoint,
  CURLOPT_HTTPHEADER      => $headers,
  CURLOPT_POST            => true,
  CURLOPT_POSTFIELDS      => $rawData,
  CURLOPT_RETURNTRANSFER  => true
]);

$content = curl_exec($request);
$response = curl_getinfo($request);

Header('HTTP/1.0 ' . $response['http_code']);
Header('Content-Type: ' . $response['content_type']);

echo $content;

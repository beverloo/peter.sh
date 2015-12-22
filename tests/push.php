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
    'https://jmt17.google.com/gcm/demo-webpush-00/',
    'https://updates.push.services.mozilla.com/push/',
  ];

  $filtered = array_filter($endpointWhitelist, function($entry) use ($endpoint) {
    return substr($endpoint, 0, strlen($entry)) == $entry;
  });

  return !!count($filtered);
}

// -----------------------------------------------------------------------------

if ($_SERVER['REQUEST_METHOD'] != 'POST')
  fatalError('405 Method Not Allowed', 'Only POST requests may be made to this tool.');

if (!array_key_exists(toHeaderName('X-Endpoint'), $_SERVER))
  fatalError('400 Bad Request', 'The X-Endpoint HTTP header must be set.');

$endpoint = $_SERVER[toHeaderName('X-Endpoint')];
$headers = [];

if (!isWhitelisted($endpoint))
  fatalError('403 Forbidden', 'The endpoint has not been whitelisted. Send a PR?');

$optionalHeaders = ['Content-Encoding', 'Encryption', 'Crypto-Key'];

foreach ($optionalHeaders as $header) {
  $key = toHeaderName($header);
  if (array_key_exists($key, $_SERVER))
    $headers[$header] = $_SERVER[$key];
}

if (strpos($endpoint, 'google') !== false) {
  $headers['Authorization'] = 'key=AIzaSyDR_72jXd9RJKrSyGcuZvn_gCi9-HSeCrM';

  // TODO(peter): Work with the GCM team to fix this.
  unset($headers['Content-Encoding']);
}


$rawData = file_get_contents('php://input');

// -----------------------------------------------------------------------------

$request = curl_init();
$requestHeaders = [];

foreach ($headers as $headerName => $headerValue)
  $requestHeaders[] = $headerName . ': ' . $headerValue;

curl_setopt_array($request, [
  CURLOPT_URL             => $endpoint,
  CURLOPT_HTTPHEADER      => $requestHeaders,
  CURLOPT_POST            => true,
  CURLOPT_POSTFIELDS      => $rawData,
  CURLOPT_RETURNTRANSFER  => true
]);

$content = curl_exec($request);
$response = curl_getinfo($request);

Header('HTTP/1.0 ' . $response['http_code']);
Header('Content-Type: ' . $response['content_type']);

echo $content;

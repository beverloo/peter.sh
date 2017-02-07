<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  foreach (apache_request_headers() as $header => $value)
    echo $header . ': ' . $value . PHP_EOL;

  exit;
}
?>
<!doctype html>
<pre id="result">Fetching self...</pre>
<script>
var result = document.getElementById('result');

if (!window.fetch) {
  result.textContent = 'No fetch() function';
} else if (!window.Headers) {
  result.textContent = 'No Headers object';
} else {
  var headers = new Headers();
  headers.append('X-Foo', 'Bar');

  var data = new ArrayBuffer(16);

  fetch(document.location.href, {
    method: 'POST',
    headers: headers,
    body: data
  }).then(function(response) {
    return response.text();
  }).then(function(text) {
    result.textContent = text;
  });
}
</script>

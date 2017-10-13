<?php
$file = __DIR__ . '/icons/8.png';
$data = file_get_contents($file);
$size = filesize($file);

apache_setenv('no-gzip', '1');

header('Content-Length: ' . $size);
header('Content-Type: image/png');

$delay = 5;
if (array_key_exists('delay', $_GET)) {
    $uncheckedDelay = intval($_GET['delay']);
    if ($uncheckedDelay > 0 && $uncheckedDelay < 120)
        $delay = $uncheckedDelay;
}

$chunkSize = floor($size / $delay);

for ($iteration = 0; $iteration < $delay; ++$iteration) {
    echo substr($data, $iteration * $chunkSize, $chunkSize);

    ob_flush();
    flush();

    sleep(1);
}

// Flush any remaining data cut off by flooring the chunk size.
echo substr($data, $chunkSize * $delay);

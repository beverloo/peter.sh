<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

$g_messages = array();
$g_options = getopt('v');

// Write all diagnostic output to a log file, even when a fatal error has occurred (in
// which case we write error information as well).
register_shutdown_function(function() {
    global $g_messages;

    $lastError = error_get_last();
    if ($lastError['type'] == E_ERROR)
        Error('Fatal error occurred (' . basename($lastError['file']) . ':' . $lastError['line'] . '): ' . $lastError['message']);

    $log = fopen(__DIR__ . '/../logs/latest.log', 'a');
    foreach ($g_messages as $message)
        fwrite($log, $message . PHP_EOL);

    fclose($log);
});

// Writes |$message| to the log file, as well as to STDOUT if we're being executed from
// a browser. Output will be ommitted from the console unless explicitly requested.
function WriteMessage($message) {
    global $g_messages, $g_options;

    $g_messages[] = date('[Y-m-d H:i:s] ') . $message;
    if (true || $g_options['v'] || !isset($_SERVER['argv']))
        echo $message . PHP_EOL;
}

// -------------------------------------------------------------------------------------------------
// Public functions for outputting diagnostic information.

function Error($message) {
    WriteMessage('[Error] ' . $message);
}

function Warning($message) {
    WriteMessage('[Warning] ' . $message);
}

function Info($message) {
    WriteMessage('[Info] ' . $message);
}

<?php
// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

if (!file_exists(__DIR__ . '/schedule-private.php'))
    exit;

require __DIR__ . '/schedule-private.php';

// -------------------------------------------------------------------------------------------------

// (1) This must be a GitHub PUSH message, indicating that a repository changed.
if (!isset ($_SERVER['HTTP_X_GITHUB_EVENT']))
    exit;

if ($_SERVER['HTTP_X_GITHUB_EVENT'] != 'push')
    exit;

// (2) This must be a GitHub request, with the entire contents signed.
if (!isset ($_SERVER['HTTP_X_HUB_SIGNATURE']))
    exit;

$signature = $_SERVER['HTTP_X_HUB_SIGNATURE'];
if (strpos($signature, '=') == false)
    exit;

list($algorithm, $hash) = explode('=', $signature, 2);

$payload = file_get_contents('php://input');
if (hash_hmac($algorithm, $payload, SECRET) != $hash)
    exit;

// -------------------------------------------------------------------------------------------------

file_put_contents('scheduled.txt', time());

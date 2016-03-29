<?php
// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

$scheduledFile = __DIR__ . '/scheduled.txt';
if (!file_exists($scheduledFile))
    exit;

$requested = file_get_contents($scheduledFile);
if (!unlink($scheduledFile))
    exit;

if ((time() - $requested) > 120)
    exit;

$commands = [
    // Updates the local copy of the repository with the most recent remote changes.
    'git fetch --all',

    // Resets the repository to the state the remote currently is in.
    'git reset --hard origin/master',

    // Remove any left-over files that are not part of the checkout, and not in .gitignore.
    'git clean -f -d',

    // Write the latest commit SHA to the VERSION file.
    'git rev-parse HEAD > VERSION',
];

$directory = realpath(__DIR__ . '/../../');
foreach ($commands as $command)
    echo shell_exec('cd ' . $directory . ' && ' . $command . ' 2>&1');

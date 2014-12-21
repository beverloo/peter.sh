<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/framework/ServiceManager.php';

// Require a valid "key" for non-CLI requests of this script.
if (php_sapi_name() != 'cli') {
    if (!isset ($_GET['key']))
        exit;

    if ($_GET['key'] != Configuration::$controlKey)
        exit;
}

$serviceManager = new ServiceManager();
if (isset ($_GET['task'])) {
    Header('Content-Type: text/plain');
    $serviceManager->runTaskByUniqueId($_GET['task']);
} else
    $serviceManager->runScheduledTasks();

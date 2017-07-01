<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

class Configuration {
    // Identifier to be passed in the "key" query parameter in order to be granted the ability
    // to execute tasks directly from the page.
    public static $controlKey = '0';

    // Details required to log in to the MySQL server.
    public static $databaseHost = 'localhost';
    public static $databaseUsername = '';
    public static $databasePassword = '';
    public static $databaseName = '';

    // Path to the local Chromium checkout.
    public static $chromiumCheckout = '';

    // E-mail address to which Chromium command-line switch updates should be send.
    public static $commandLineUpdateAddress = 'chromium-command-line-updates@googlegroups.com';

    // E-mail address to which service monitor updates should be send.
    public static $serviceMonitorUpdateAddress = '';

    // E-mail address to which css property updates should be send.
    public static $cssUpdateAddress = '';
};

if (file_exists(__DIR__ . '/config.private.php'))
    require_once __DIR__ . '/config.private.php';

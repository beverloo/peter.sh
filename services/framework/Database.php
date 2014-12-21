<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

require_once __DIR__ . '/../config.php';

class Database extends MySQLi {
    public function __construct() {
        parent::__construct(Configuration::$databaseHost,
                            Configuration::$databaseUsername,
                            Configuration::$databasePassword,
                            Configuration::$databaseName);
    }
};

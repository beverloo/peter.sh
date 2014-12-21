<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

require_once __DIR__ . '/Database.php';

class TaskEnvironment {
    // The shared task environment.
    private static $s_taskEnvironment;

    // Returns the active task environment instance if one exists, or creates one if it doesn't.
    // All tasks which will be executed share the same environment.
    public static function GetInstance() {
        if (self::$s_taskEnvironment === null)
            self::$s_taskEnvironment = new TaskEnvironment();

        return self::$s_taskEnvironment;
    }

    // ---------------------------------------------------------------------------------------------

    // Database instance for the services, using /services/config.json to determine auth information.
    // The connection will be established lazily on first use.
    private $m_database;

    public function database() {
        if ($this->m_database === null)
            $this->m_database = new Database();

        return $this->m_database;
    }
};

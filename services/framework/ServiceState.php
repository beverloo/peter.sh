<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

class ServiceState {
    // File in which service state will be stored, relative to the directory of this file.
    const StateFile = '/../services/state.json';

    // Enumeration values which may be used by services to indicate their current state.
    const Good      = 'good';
    const Warning   = 'warning';
    const Error     = 'error';

    // Static instance for the service state, only accessible from the static members.
    private static $s_instance;

    // Current service state, which will be loaded by the constructed and saved on demand.
    private $m_state;

    // Gets a unix timestamp indicating the last time that |$task| was executed.
    public static function GetLastExecutionTime($task) {
        if (self::$s_instance === null)
            self::$s_instance = new self();

        return self::$s_instance->get($task['unique_id']);
    }

    // Gets a unix timestamp indicating the last time we tried to execute tasks.
    public static function GetLastIterationTime() {
        return self::GetLastExecutionTime(['unique_id' => '@']);
    }

    // Updates the service state, marking that |$task| has been executed.
    public static function UpdateTaskLastExecutionTime($task) {
        if (self::$s_instance === null)
            self::$s_instance = new self();

        self::$s_instance->update($task['unique_id']);
    }

    // Updates the service state to mark the current time as the last iteration time.
    public static function UpdateLastIterationTime() {
        return self::UpdateTaskLastExecutionTime(['unique_id' => '@']);
    }

    // ---------------------------------------------------------------------------------------------

    private function __construct() {
        $this->m_state = json_decode(file_get_contents(__DIR__ . ServiceState::StateFile), true);
        if ($this->m_state === null)
            Error('Unable to decode the service state file (' . ServiceState::StateFile . ').');
    }

    private function get($taskId) {
        if (!array_key_exists($taskId, $this->m_state))
            return 0;

        return $this->m_state[$taskId];
    }

    private function update($taskId) {
        $this->m_state[$taskId] = time();

        file_put_contents(__DIR__ . ServiceState::StateFile, json_encode($this->m_state));
    }
};

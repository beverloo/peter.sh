<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

abstract class Service {
    // May be overridden by services to register the tasks they would like to
    // periodically execute. The default implementation will not register any
    // repeating tasks.
    public static function RegisterTasks(ServiceManager $manager) {}

    // Queries the task for its current state. It should return an associative
    // array containing all relevant information, including some metadata which
    // could be used for further clarification.
    //
    // {
    //     "name": ..
    //     "description": ..
    // }
    //
    public static function QueryState(TaskEnvironment $env) { return false; }

    // May be overridden by the service as an alternative to the constructor,
    // which we use to ensure that critical services such as the database are
    // available to the service.
    public function OnCreate() {}

    // ---------------------------------------------------------------------------------------------

    // The TaskEnvironment instance made available for running this task.
    private $m_taskEnvironment;

    // The interval at which the current task will be executing.
    protected $interval;

    public final function __construct($environment, $task) {
        $this->m_taskEnvironment = $environment;
        $this->interval = $task['interval'];

        $this->OnCreate();
    }

    protected final function database() {
        return $this->m_taskEnvironment->database();
    }
};

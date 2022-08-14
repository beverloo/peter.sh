<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

require_once __DIR__ . '/Logging.php';
require_once __DIR__ . '/Service.php';
require_once __DIR__ . '/ServiceState.php';
require_once __DIR__ . '/TaskEnvironment.php';

class ServiceManager {
    // Directory in which the services reside, relative to the directory of this file.
    const ServiceDirectory = '/../services/';

    // Maximum number of tasks the manager may execute. New tasks will only be executed if the
    // maximum execution time threshold doesn't get exceeded either.
    const MaximumTasksToExecute = 5;

    // Maximum number of seconds during which tasks may be executed. While we're within this
    // amount of time, a maximum of |MaximumTasksToExecute| tasks will be executed.
    const MaximumTimeToExecute = 45;

    // List of services which have been found on the server.
    private $m_services = array();

    // List of tasks which have been registered by services.
    private $m_tasks = array();

    // Name of the current service for which tasks are being registered.
    private $m_currentService;

    public function __construct() {
        foreach (new DirectoryIterator(__DIR__ . ServiceManager::ServiceDirectory) as $entry) {
            if ($entry->isDot() || $entry->isDir() === false)
                continue;

            $directory = $entry->getFilename();

            $name = $this->directoryToServiceName($directory);
            $filename = __DIR__ . ServiceManager::ServiceDirectory . $directory . '/' . $name . '.php';

            if (!file_exists($filename)) {
                Warning('Service "' . $name . '" does not contain a master PHP file.');
                continue;
            }

            require_once $filename;

            if (!class_exists($name, false)) {
                Warning('Service "' . $name . '" does not define a class with the service\'s name.');
                continue;
            }

            $this->m_currentService = $name;

            $existingTaskCount = count($this->m_tasks);
            $name::RegisterTasks($this);

            if (count($this->m_tasks) !== $existingTaskCount)
                $this->m_services[] = $name;

            $this->m_currentService = null;
        }
    }

    // Loads all services and queries them for their current state. Tasks have a limited
    // amount of freedom (specified in Service.php) to indicate their current status, as
    // well of that of each of the sub-tasks it might consist of.
    public function queryServiceStates() {
        $state = array(
            'last_iteration'    => ServiceState::GetLastIterationTime(),
            'services'          => array()
        );

        $environment = TaskEnvironment::GetInstance();
        foreach ($this->m_services as $name) {
            $state['services'][$name] = array(
                'details'   => $name::QueryState($environment),
                'tasks'     => array()
            );

            foreach ($this->m_tasks as $task) {
                if ($task['service'] != $name)
                    continue;

                $state['services'][$name]['tasks'][] = array(
                    'interval'          => $task['interval'],
                    'last_execution'    => ServiceState::GetLastExecutionTime($task),
                    'name'              => implode('::', $task['callback']),
                    'unique_id'         => $task['unique_id']
                );
            }
        }

        return $state;
    }

    // Loads the services which were found in the constructor and checks whether they
    // will register any cron tasks. If they do, execute them if timing is appropriate.
    public function runScheduledTasks() {
        ServiceState::UpdateLastIterationTime();
        if (!count($this->m_tasks))
            return;

        $currentTime = time();
        $executionCount = 0;

        // Gather the last execution time for each task, and sort the task in a descending
        // order prioritizing the tasks which are longest overdue.
        foreach ($this->m_tasks as $index => $task)
            $this->m_tasks[$index]['last_execution'] = ServiceState::GetLastExecutionTime($task);

        usort($this->m_tasks, function($left, $right) use ($currentTime) {
            $leftOverdue = $currentTime - $left['last_execution'] - $left['interval'];
            $rightOverdue = $currentTime - $right['last_execution'] - $right['interval'];

            return $leftOverdue > $rightOverdue ? -1 : 1;
        });

        // Now execute the tasks which are overdue. We process a maximum of |MaximumTasksToExecute|
        // per iteration, running new tasks as long as |MaximumTimeToExecute| doesn't get hit.
        foreach ($this->m_tasks as $task) {
            if (($currentTime - $task['last_execution'] - $task['interval']) < 0)
                return;

            if ($executionCount++ > self::MaximumTasksToExecute || (time() - $currentTime) > self::MaximumTimeToExecute)
                return;
            
            $this->runTask($task);
        }
    }

    // Executes the task identified by |$uniqueId|.
    public function runTaskByUniqueId($uniqueId) {
        foreach ($this->m_tasks as $task) {
            if ($task['unique_id'] != $uniqueId)
                continue;

            $this->runTask($task);
            return true;
        }

        return false;
    }

    // Executes |$task| and outputs diagnostic information to a log file. The task environment
    // (e.g. the database connection) will be initialized lazily.
    private function runTask($task) {
        Info('Running task "' . implode('::', $task['callback']) . '" (id: ' . $task['unique_id'] . ').');
        $taskStart = microtime(true);

        $instance = new $task['callback'][0](TaskEnvironment::GetInstance(), $task);
        call_user_func(array($instance, $task['callback'][1]));

        Info('Ran task "' . implode('::', $task['callback']) . ' in ' . sprintf('%.2f', (microtime(true) - $taskStart) * 1000) . 'ms.');

        ServiceState::UpdateTaskLastExecutionTime($task);
    }

    // May be used by services to schedule tasks in their static RegisterTasks method.
    // Tasks will only be executed when their interval has expired. |$interval| must be
    // a string accepted by DateInterval::createFromDateString().
    public function scheduleTask($intervalString, $callback) {
        $interval = DateInterval::createFromDateString($intervalString);
        $seconds = $interval->s +
                   $interval->i * 60 +
                   $interval->h * 60 * 60 +
                   $interval->d * 60 * 60 * 24 +
                   $interval->m * 60 * 60 * 24 * 30.25 +
                   $interval->y * 60 * 60 * 24 * 365;

        if ($interval === false || $seconds <= 0) {
            Warning('Scheduled task for service "' . $this->m_currentService . '" has an invalid interval: "' . $intervalString . '"');
            return;
        }

        if (!method_exists($callback[0], $callback[1])) {
            Warning('Scheduled task for service "' . $this->m_currentService . '" has an invalid callback.');
            return;
        }

        $unique_id = sha1($seconds . implode(' ', $callback));

        $this->m_tasks[] = array(
            'interval'  => $seconds,
            'callback'  => $callback,
            'service'   => $this->m_currentService,
            'unique_id' => $unique_id
        );
    }

    // Converts |$directory|, which will be lower-case and may contain hyphens, to a
    // service name, which indicates the main PHP file containing the service's code.
    private function directoryToServiceName($directory) {
        return preg_replace('/\s+/s', '', ucwords(str_replace('-', ' ', $directory)));
    }
};

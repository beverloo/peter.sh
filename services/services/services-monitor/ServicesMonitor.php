<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

class ServicesMonitor extends Service {
    // Registers the monitoring task, which will once per day check and rotate the log
    // files and distribute an e-mail with all the warnings and errors (if any).
    public static function RegisterTasks(ServiceManager $manager) {
        $manager->scheduleTask('24 hours', array(__CLASS__, 'verifyAndRotateLogs'));
    }

    // Returns the current state of the entire service manager, which includes whether
    // it is still running per the crontab.
    public static function QueryState(TaskEnvironment $env) {
        $state = ServiceState::Good;

        $lastIteration = ServiceState::GetLastIterationTime();
        if ($lastIteration < (time() - 60 * 60))
            $state = ServiceState::Warning;
        
        if ($lastIteration < (time() - 12 * 60 * 60))
            $state = ServiceState::Error;

        return array(
            'name'          => 'Service Monitor',
            'description'   => 'Monitors the services run-time and distributes updates by e-mail in case of any warnings or errors.',
            'state'         => $state,
            'subtasks'      => array(
                array(
                    'name'      => 'Service Iteration',
                    'date'      => ServiceState::GetLastIterationTime(),
                    'value'     => '\o/'
                )
            )
        );
    }

    // ---------------------------------------------------------------------------------------------

    // Rotates the log files in a single file per day. We store 30 days of log files at most. If any
    // warnings or errors were found in the past 24 hours, an e-mail will be send to Peter.
    public function verifyAndRotateLogs() {
        $directory = realpath(__DIR__ . '/../../logs/');
        $latest = $directory . '/latest.log';

        if (!file_exists($latest)) {
            Error('ServicesMonitor: The latest log file does not exists (/logs/latest.log).');
            return;
        }

        if (!is_writable($directory)) {
            Error('ServicesMonitor: Unable to write to the logs (/logs/) directory.');
            return;
        }

        $logs = array();
        $errors = array();
        $warnings = array();
        $invalid = array();

        $entries = file($latest);
        while (($line = array_shift($entries)) !== null) {
            $line = trim($line);
            if (!strlen($line))
                continue;

            if (!preg_match('/^\[(\d+-\d+-\d+ \d+:\d+:\d+)\] \[(Error|Warning|Info)\] (.*?)$/s', $line, $matches)) {
                $invalid[] = $line;
                continue;
            }

            while (count($entries) > 0 && substr(reset($entries), 0, 3) != '[20')
                $matches[3] .= PHP_EOL . trim(array_shift($entries));

            $date = substr($matches[1], 0, 10);
            if (!array_key_exists($date, $logs))
                $logs[$date] = array();

            $logs[$date][] = $matches;

            if ($matches[2] == 'Warning')
                $warnings[] = $matches;

            if ($matches[2] == 'Error')
                $errors[] = $matches;
        }

        foreach ($logs as $date => $entries) {
            $file = fopen($directory . '/' . $date . '.log', 'a');
            foreach ($entries as $entry)
                fwrite($file, '[' . $entry[1] . '] [' . $entry[2] . '] ' . trim($entry[3]) . PHP_EOL);

            fclose($file);
        }

        file_put_contents($latest, '');

        if (!count($errors) && !count($warnings) && !count($invalid))
            return;

        $message = $this->loadMessage($errors, $warnings, $invalid);
        $subject = 'Service Monitor update for ' . date('Y-m-d');
        $headers = array(
            'From: Peter Beverloo <services@peter.sh>',
            'Reply-To: Peter Beverloo <services@peter.sh>',
            'Return-Path: Peter Beverloo <services@peter.sh>',
            'Content-Type: text/html'
        );

        mail(Configuration::$serviceMonitorUpdateAddress, $subject, $message, implode("\r\n", $headers));
    }

    // Loads the message to send to the list from message.html, having only |$errors|, |$warnings|
    // and |$invalid| available in the local scope. The message will be evaluated as PHP.
    private function loadMessage($errors, $warnings, $invalid) {
        ob_start();
        include __DIR__ . '/message.html';
        return ob_get_clean();
    }
};

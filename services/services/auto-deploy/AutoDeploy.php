<?php
// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

class AutoDeploy extends Service {
    // Registers the task that will be used for auto-deploying peter.sh.
    public static function RegisterTasks(ServiceManager $manager) {
        $manager->scheduleTask('5 minutes', array(__CLASS__, 'updateRepository'));
    }

    // Returns the current status of the repository's auto-deploy service.
    public static function QueryState(TaskEnvironment $env) {
        $revisionFile = __DIR__ . '/../../../VERSION';

        $modified = 0;
        $value = 'n/a';

        if (file_exists($revisionFile) && is_readable($revisionFile)) {
            $modified = filemtime($revisionFile);

            $revision = trim(file_get_contents($revisionFile));
            $revisionShort = substr($revision, 0, 7);

            $value  = '<a href="https://github.com/beverloo/peter.sh/commit/' . $revision . '">';
            $value .= $revisionShort . '</a>';
        }

        return [
            'name'          => 'GitHub auto-deploy hook',
            'description'   => 'Automatically updates the repository in response to a push to the GitHub repository.',
            'state'         => ServiceState::Good,
            'subtasks'      => [
                [
                    'name'      => 'Current revision',
                    'date'      => $modified,
                    'value'     => $value
                ]
            ]
        ];
    }

    // Checks whether the repository has to be updated, and does so when that's the case.
    public function updateRepository() {
        $scheduledFile = __DIR__ . '/scheduled.txt';
        if (!file_exists($scheduledFile))
            return;

        $requested = file_get_contents($scheduledFile);
        if (!unlink($scheduledFile))
            return;

        if ((time() - $requested) > 120)
            return;

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

        $directory = realpath(__DIR__ . '/../../../');

        foreach ($commands as $command)
            Info(trim(shell_exec('cd ' . $directory . ' && ' . $command . ' 2>&1')));

        Info('AutoDeploy: Updated to revision ' . file_get_contents(__DIR__ . '/../../../VERSION') . '.');
    }
}

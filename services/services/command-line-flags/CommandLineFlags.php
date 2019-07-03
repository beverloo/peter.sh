<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.
//Shago7932/Master
Code of conduct 
Report transparency
class CommandLineFlags extends Service {
    // Registers the task which will be used for updating the command line flags
    // available in the Chromium repository.
    public static function RegisterTasks(ServiceManager $manager) {
        $manager->scheduleTask('3 hours', array(__CLASS__, 'updateFlags'));
        $manager->scheduleTask('24 hours', array(__CLASS__, 'sendDailyOverview'));
    }

    // Returns the current status of the command line flag tracking service.
    public static function QueryState(TaskEnvironment $env) {
        $result = $env->database()->query('
            SELECT
                switch_sourcepath AS filename,
                COUNT(switch_id) AS switch_count
            FROM
                chromium_switches
            WHERE
                removed = "0000-00-00 00:00:00"
            GROUP BY
                switch_sourcepath');

        $switches = 0;
        $files = 0;

        while ($result !== false && $row = $result->fetch_assoc()) {
            $switches += $row['switch_count'];
            $files++;
        }

        $last_update = 0;
        $result = $env->database()->query('
            SELECT
                UNIX_TIMESTAMP(GREATEST(added, updated, removed)) AS last_update
            FROM
                chromium_switches
            ORDER BY
                GREATEST(added, updated, removed) DESC
            LIMIT
                1');

        if ($result !== false)
            $last_update = $result->fetch_object()->last_update;

        return array(
            'name'          => 'Chromium command-line flag tracker',
            'description'   => 'Tracks and indexes the command line flags available to Chromium and Google Chrome.',
            'state'         => ServiceState::Good,
            'subtasks'      => array(
                array(
                    'name'  => 'Indexed command-line switches',
                    'date'  => $last_update,
                    'value' => '<a href="http://peter.sh/experiments/chromium-command-line-switches/">' . $switches . ' switches, ' . $files . ' files</a>',
                )
            )
        );
    }

    // ---------------------------------------------------------------------------------------------

    // Contains a list of switches which we parsed from the source files.
    private $m_switches;

    // Pre-processor directives which are currently active in the source file.
    private $m_preProcessorStack;

    // Sends a daily overview e-mail to a mailing list of added, updated and removed
    // switches in Chromium's source code.
    public function sendDailyOverview() {
        $since = time() - $this->interval;
        $sinceDate = date('Y-m-d H:i:s', $since);

        $result = $this->database()->query('
            SELECT
                chromium_switches.switch_id,
                chromium_switches.switch_name,
                chromium_switches.switch_description,
                UNIX_TIMESTAMP(chromium_switches.added) AS added,
                UNIX_TIMESTAMP(chromium_switches.updated) AS updated,
                UNIX_TIMESTAMP(chromium_switches.removed) AS removed
            FROM
                chromium_switches
            WHERE
                chromium_switches.added >= "' . $sinceDate . '" OR
                chromium_switches.updated >= "' . $sinceDate . '" OR
                chromium_switches.removed >= "' . $sinceDate . '"
            ORDER BY
                chromium_switches.switch_name ASC');

        if ($result === false) {
            Error('CommandLineFlags: Unable to retrieve database list for daily overview e-mail.');
            return;
        }

        $switches = array('added' => array(), 'updated' => array(), 'removed' => array());
        $updates = 0;

        while ($switch = $result->fetch_assoc()) {
            $reason = 'added';
            if ($switch['updated'] >= $since)
                $reason = 'updated';
            else if ($switch['removed'] >= $since)
                $reason = 'removed';

            $switches[$reason][] = $switch;
            $updates++;
        }

        if ($updates == 0)
            return;

        $message = $this->loadMessage($switches, $updates);
        $subject = 'Chromium Command Line Updates for ' . date('Y-m-d');
        $headers = array(
            'From: Peter Beverloo <peter@lvp-media.com>',
            'Reply-To: Peter Beverloo <peter@lvp-media.com>',
            'Return-Path: Peter Beverloo <peter@lvp-media.com>',
            'Content-Type: text/html'
        );

        mail(Configuration::$commandLineUpdateAddress, $subject, $message, implode("\r\n", $headers));
    }

    // Loads the message to send to the list from message.html, having only |$switches| and
    // |$updates| available in the local scope. The message will be evaluated as PHP.
    private function loadMessage($switches, $updates) {
        $url = 'http://peter.sh/experiments/chromium-command-line-switches/';

        ob_start();
        include __DIR__ . '/message.html';
        return ob_get_clean();
    }

    // Updates the command line flags available in Chromium. We retrieve a list of
    // all the switch files from the Git repository hosted on Nishino, then attempt to
    // parse every file to identify the command line flags contained within it.
    public function updateFlags() {
        $sourceFlags = $this->loadFlagsFromSource();
        $databaseFlags = $this->loadFlagsFromDatabase();

        $createStatement = $this->database()->prepare('
            INSERT INTO
                chromium_switches
                (switch_name, switch_internal, switch_description, switch_conditions, switch_sourcepath, added)
            VALUES
                (?, ?, ?, ?, ?, NOW())');

        $updateStatement = $this->database()->prepare('
            UPDATE
                chromium_switches
            SET
                switch_internal = ?,
                switch_description = ?,
                switch_conditions = ?,
                switch_sourcepath = ?,
                updated = NOW()
            WHERE
                switch_id = ?');

        $removeStatement = $this->database()->prepare('
            UPDATE
                chromium_switches
            SET
                removed = NOW()
            WHERE
                switch_id = ?');

        $stats = array('created' => 0, 'updated' => 0, 'removed' => 0);

        foreach ($databaseFlags as $name => $switch) {
            if (!array_key_exists($name, $sourceFlags)) {
                $removeStatement->bind_param('i', $switch['database_id']);
                $removeStatement->execute();
                $stats['removed']++;

                continue;
            }

            $sourceSwitch = $sourceFlags[$name];
            unset($sourceFlags[$name]);

            if ($sourceSwitch['constant'] != $switch['constant'] ||
                $sourceSwitch['conditions'] != $switch['conditions'] ||
                $sourceSwitch['description'] != $switch['description'] ||
                $sourceSwitch['filename'] != $switch['filename']) {
                $updateStatement->bind_param('ssssi', $sourceSwitch['constant'], $sourceSwitch['description'], $sourceSwitch['conditions'], $sourceSwitch['filename'], $switch['database_id']);
                $updateStatement->execute();
                $stats['updated']++;
            }
        }

        foreach ($sourceFlags as $name => $switch) {
            $createStatement->bind_param('sssss', $name, $switch['constant'], $switch['description'], $switch['conditions'], $switch['filename']);
            $createStatement->execute();
            $stats['created']++;
        }

        Info('CommandLineFlags: Created ' . $stats['created'] . ' switch(es), updated ' . $stats['updated']
                . ' switch(es), removed ' . $stats['removed'] . ' switch(es).');
    }

    // Reads the current command line flags from Chromium's source tree.
    private function loadFlagsFromSource() {
        $files = $this->loadSwitchFiles();
        if (!count($files))
            return;

        $blacklist = file(__DIR__ . '/blacklist.txt');
        foreach ($blacklist as $file) {
            $file = trim($file);
            if (!strlen($file) || substr($file, 0, 1) == '#')
                continue;

            if (!array_key_exists($file, $files))
                continue;

            unset($files[$file]);
        }

        if (!count($files))
            return;

        $this->m_switches = array();
        $this->m_preProcessorStack = array();

        foreach ($files as $filename => $content) {
            if ($this->parseFile($filename, $content))
                continue;

            Warning('CommandLineFlags: Unable to parse source file "' . $filename . '".');
        }
        
        Info('CommandLineFlags: Found ' . count($this->m_switches) . ' switches in ' . count($files) . ' files (source).');
        return $this->m_switches;
    }

    // Reads the list of command line flags known to the MySQL database.
    private function loadFlagsFromDatabase() {
        $result = $this->database()->query('
            SELECT
                chromium_switches.switch_id,
                chromium_switches.switch_name,
                chromium_switches.switch_internal,
                chromium_switches.switch_description,
                chromium_switches.switch_conditions,
                chromium_switches.switch_sourcepath
            FROM
                chromium_switches
            WHERE
                chromium_switches.removed = "0000-00-00 00:00:00"
            ORDER BY
                chromium_switches.switch_name ASC');

        $switches = array();
        $files = array();

        if ($result === false) {
            Error('CommandLineFlags: Unable to read existing command line switches from the database.');
            return array();
        }

        while ($switch = $result->fetch_assoc()) {
            $files[$switch['switch_sourcepath']] = 1;

            $switches[$switch['switch_name']] = array(
                'constant'      => $switch['switch_internal'],
                'conditions'    => $switch['switch_conditions'],
                'description'   => $switch['switch_description'],
                'filename'      => $switch['switch_sourcepath'],

                'database_id'   => $switch['switch_id']
            );
        }

        Info('CommandLineFlags: Found ' . count($switches) . ' switches in ' . count($files) . ' files (database).');
        return $switches;
    }

    // Parses |$content| into a map of command line switches, with the switch' name being the
    // key, and a set of (description, filename, line, variable) being the value.
    private function parseFile($filename, $contentString) {
        $contentArray = explode(PHP_EOL, $contentString);
        $comments = array();

        while (($line = array_shift($contentArray)) !== null) {
            $character = substr($line, 0, 1);
            switch ($character) {
                case '/':  // comment
                    $comments[] = trim(substr($line, 2));
                    break;

                case '#':  // pre-processor directive
                    if (!$this->parsePreProcessorLine($filename, $line))
                        return false;

                    break;

                case 'c':  // switch definition
                    $switch = $this->parseSwitchDefinition($line, $contentArray);
                    if (is_array($switch)) {
                        $this->m_switches[$switch['switch']] = array(
                            'constant'      => $switch['constant'],
                            'conditions'    => $switch['conditions'],
                            'description'   => implode(' ', $comments),
                            'filename'      => $filename
                        );
                    }

                    // deliberate fall-through.
                default:
                    $comments = array();
                    break;
            }
        }

        return true;
    }

    // Parses the command line switch defined in |$line|, optionally considering the next line
    // as well if a break is found, and returns basic info in an array.
    private function parseSwitchDefinition($line, &$contentArray) {
        if (!preg_match ('/^const char k([^\[]+)\s*\[\]\s*=/s', $line, $matches))
            return true;  // ignore invalid lines

        $line = trim(substr($line, strlen($matches[0])));
        if (!strlen($line) && count($contentArray) > 0)
            $line = trim(array_shift($contentArray));

        if (substr($line, 0, 1) != '"' || substr($line, -2) != '";')
            return true;  // ignore weird definitions.

        $conditions = '';
        if (count($this->m_preProcessorStack)) {
            $conditions = array();
            foreach ($this->m_preProcessorStack as $condition)
                $conditions += $condition;
        }

        return array(
            'switch'        => substr($line, 1, -2),
            'constant'      => 'k' . $matches[1],
            'conditions'    => serialize($conditions)
        );
    }

    // Parses the pre-processor directive(s) contained in |$line|. They can be nested, so we
    // maintain a stack of active directives as a class member.
    private function parsePreProcessorLine($filename, $line) {
        $type = substr($line, 1, strcspn($line, " \t") - 1);
        $text = trim(substr($line, strlen($type) + 1));

        switch ($type) {
            case 'if':
            case 'ifdef':
                $directive = $this->parsePreProcessorDirective($filename, $text, false);
                if ($directive === false)
                    return false;

                array_push($this->m_preProcessorStack, $directive);
                break;

            case 'ifndef':
                $directive = $this->parsePreProcessorDirective($filename, $text, true);
                if ($directive === false)
                    return false;

                array_push($this->m_preProcessorStack, $directive);
                break;

            case 'elif':
            case 'else':
                if (!count($this->m_preProcessorStack)) {
                    Warning('CommandLineFlags: Invalid pre-processor directive nesting level in "' . $filename . '" (elif/else).');
                    return false;
                }

                $conditions = array_pop($this->m_preProcessorStack);
                foreach ($conditions as &$condition)
                    $condition['negate'] = !$condition['negate'];

                if ($type == 'elif') {
                    $additionalConditions = $this->parsePreProcessorDirective($filename, $text, false);
                    if ($additionalConditions === false)
                        return false;

                    foreach ($additionalConditions as $condition)
                        $conditions[] = $condition;
                }

                array_push($this->m_preProcessorStack, $conditions);
                break;

            case 'endif':
                if (!count($this->m_preProcessorStack)) {
                    Warning('CommandLineFlags: Invalid pre-processor directive nesting level in "' . $filename . '" (endif).');
                    return false;
                }

                array_pop($this->m_preProcessorStack);
                break;

            case 'include':
                // Valid pre-processor directives, but we don't need them and thus ignore them.
                break;

            default:
                Warning('CommandLineFlags: Unrecognized pre-processor directive: ' . $type . ' (in "' . $filename . '").');
                return false;
        }

        return true;
    }

    // Parses |$directive|, optionally negating it if |$negate| has been set. Returned will be an
    // array of the parsed directive, whether it's negated and whether it's OR or AND.
    private function parsePreProcessorDirective($filename, $directive, $negate) {
        $components = preg_split('/\s*(\|\||&&)\s*/s', $directive);
        $conditions = array();

        foreach ($components as $component) {
            $conditions[] = array(
                'negate'    => $negate || substr($component, 0, 1) == '!',
                'define'    => preg_replace('/!?defined\(([^\)]+)\)/s', '\\1', $component),
                'or'        => strpos($directive, '||') !== false
            );
        }

        return $conditions;
    }

    // Loads a list of the switch files from the Git repository, accompanied by the contents
    // of said file to prevent several round-trips between the servers.
    private function loadSwitchFiles() {
        $requestUrl = Configuration::$chromiumRepoTool . '?repository=/&command=switch-files';

        $response = @ file_get_contents($requestUrl);
        if ($response === false) {
            Error('CommandLineFlags: Unable to fetch a list of switch files from the repository.');
            return array();
        }

        $files = json_decode($response, true);
        if ($files === null) {
            Error('CommandLineFlags: Unable to decode the list of switch files from the repository.');
            Error('CommandLineFlags: ' . substr($response, 0, 128));
            return array();
        }

        return $files;
    }

};

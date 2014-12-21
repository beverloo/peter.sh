<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

class CSSProperties extends Service {
    // Registers the task using which we'll poll for new CSS properties in WebKit,
    // Blink and Gecko. Trident will (still) have to be updated manually.
    public static function RegisterTasks(ServiceManager $manager) {
        $manager->scheduleTask('24 hours', array(__CLASS__, 'updateProperties'));
        $manager->scheduleTask('24 hours', array(__CLASS__, 'sendDailyOverview'));
    }

    // Returns the current state of the repository tracker service. Beyond the default
    // metadata, we also include the available repositories and the date of the most
    // recent commit which was made to them.
    public static function QueryState(TaskEnvironment $env) {
        $subtasks = array();
        $state = ServiceState::Warning;

        $result = $env->database()->query('
            SELECT
                css_properties.property_engine_name,
                GREATEST(MAX(css_properties.added), MAX(css_properties.removed)) AS last_updated,
                (
                    SELECT
                        COUNT(*)
                    FROM
                        css_properties inner_tbl
                    WHERE
                        inner_tbl.removed = "0000-00-00 00:00:00" AND
                        inner_tbl.property_engine_name = css_properties.property_engine_name
                ) AS property_count
            FROM
                css_properties
            GROUP BY
                css_properties.property_engine_name
            ORDER BY
                css_properties.property_engine_name ASC');

        $last_updated = 0;

        while ($result !== false && $row = $result->fetch_assoc()) {
            $link = 'http://peter.sh/experiments/vendor-prefixed-css-properties-' . strtolower($row['property_engine_name']) . '/';
            $date = strtotime($row['last_updated']);
            
            if ($last_updated < $date)
                $last_updated = $date;

            $subtasks[] = array(
                'name'      => $row['property_engine_name'],
                'date'      => $date,
                'value'     => '<a href="' . $link . '">' . $row['property_count'] . ' properties</a>'
            );
        }

        if ($last_updated > (time() - /** ~3 months **/ 3 * 30.25 * 24 * 60 * 60))
            $state = ServiceState::Good;

        return array(
            'name'          => 'CSS Property Tracker',
            'description'   => 'Tracks the list of CSS properties supported by Blink, Gecko and WebKit. Trident has to be updated manually.',
            'state'         => $state,
            'subtasks'      => $subtasks
        );
    }

    // ---------------------------------------------------------------------------------------------

    // Source files (publicly accessible) for the properties of the engines we want to support.
    const BlinkSourceFile = 'https://secure.peter.sh/git/chromium/src/third_party/WebKit/Source/core/css/CSSProperties.in';
    const WebKitSourceFile = 'http://trac.webkit.org/export/HEAD/trunk/Source/WebCore/css/CSSPropertyNames.in';
    const GeckoSourceFile = 'http://hg.mozilla.org/mozilla-central/raw-file/tip/layout/style/nsCSSPropList.h';
    const TridentFile = 'trident.txt';

    // Prepared statements which will be used for updating the database.
    private $m_createStatement;
    private $m_removeStatement;

    // Sends an e-mail to a selected list of addresses when a change has occurred in the
    // available CSS properties for any of the browser engines.
    public function sendDailyOverview() {
        $since = time() - $this->interval;
        $sinceDate = date('Y-m-d H:i:s', $since);

        $result = $this->database()->query('
            SELECT
                css_properties.property_name,
                css_properties.property_engine_name,
                UNIX_TIMESTAMP(css_properties.added) AS added,
                UNIX_TIMESTAMP(css_properties.removed) AS removed
            FROM
                css_properties
            WHERE
                css_properties.added >= "' . $sinceDate . '" OR
                css_properties.removed >= "' . $sinceDate . '"
            ORDER BY
                css_properties.property_name ASC');

        if ($result === false) {
            Error('CSSProperties: Unable to fetch a list of updated properties from the database.');
            return;
        }

        $mutations = array();
        $updates = 0;

        while ($row = $result->fetch_assoc()) {
            $engine = $row['property_engine_name'];
            if (!array_key_exists($engine, $mutations))
                $mutations[$engine] = array('added' => array(), 'removed' => array());

            $mutation = 'added';
            if ($row['removed'] >= $since)
                $mutation = 'removed';

            $mutations[$engine][$mutation][] = $row['property_name'];
            $updates++;
        }

        if ($updates === 0)
            return;

        $message = $this->loadMessage($mutations, $updates);
        $subject = 'CSS Property Updates for ' . date('Y-m-d');
        $headers = array(
            'From: Peter Beverloo <services@peter.sh>',
            'Reply-To: Peter Beverloo <services@peter.sh>',
            'Return-Path: Peter Beverloo <services@peter.sh>',
            'Content-Type: text/html'
        );

        mail(Configuration::$cssUpdateAddress, $subject, $message, implode("\r\n", $headers));
    }

    // Loads the message to send to the list from message.html, having only |$mutations| and
    // |$updates| available in the local scope. The message will be evaluated as PHP.
    private function loadMessage($mutations, $updates) {
        ob_start();
        include __DIR__ . '/message.html';
        return ob_get_clean();
    }

    // Polls for new CSS properties as part of the engines we can poll automatically. The
    // list for Trident will have to be updated manually.
    public function updateProperties() {
        $this->m_createStatement = $this->database()->prepare('
            INSERT INTO
                css_properties
                (property_name, property_unprefixed_name, property_engine_name, added)
            VALUES
                (?, ?, ?, NOW())');

        $this->m_removeStatement = $this->database()->prepare('
            UPDATE
                css_properties
            SET
                removed = NOW()
            WHERE
                property_id = ?');

        $this->updatePropertiesForEngine('Blink', $this->loadSwitchesFromWebKitList(self::BlinkSourceFile));
        $this->updatePropertiesForEngine('WebKit', $this->loadSwitchesFromWebKitList(self::WebKitSourceFile));
        $this->updatePropertiesForEngine('Gecko', $this->loadSwitchesFromGeckoList(self::GeckoSourceFile));
        $this->updatePropertiesForEngine('Trident', $this->loadSwitchesFromFile(self::TridentFile));
    }

    // Loads the existing properties for |$engine| from the database, diffs that against
    // the list of properties received in |$properties|, and updates the database.
    private function updatePropertiesForEngine($engine, $properties) {
        if ($properties === false)
            return;

        Info('CSSProperties: Found ' . count($properties) . ' properties for ' . $engine . '.');

        $existing = $this->loadExistingPropertiesForEngine($engine);
        if ($existing === false)
            return;

        if (count($properties) <= (count($existing) / 2)) {
            Error('CSSProperties: More than half the properties for ' . $engine . ' seem to have been removed. Aborting.');
            return;
        }

        $created = 0;
        $removed = 0;

        foreach ($existing as $property => $databaseId) {
            if (!array_key_exists($property, $properties)) {
                $this->m_removeStatement->bind_param('i', $databaseId);
                $this->m_removeStatement->execute();
                $removed++;
            }

            unset($properties[$property]);
        }

        foreach ($properties as $property => $unused) {
            $this->m_createStatement->bind_param('sss', $property, $this->unprefixedName($property), $engine);
            $this->m_createStatement->execute();
            $created++;
        }

        if ($removed > 0 || $created > 0)
            Info('CSSProperties: Wrote ' . $created . ' new properties and removed ' . $removed . ' properties for ' . $engine . '.');
    }

    // Returns the unprefixed name for |$property|, or the original name if it's not prefixed.
    private function unprefixedName($property) {
        return preg_replace('/^\-(.+?)\-/', '', $property);
    }

    // Loads a sorted map of all existing properties for |$engine| from the database.
    private function loadExistingPropertiesForEngine($engine) {
        $result = $this->database()->query('
            SELECT
                css_properties.property_id,
                css_properties.property_name
            FROM
                css_properties
            WHERE
                css_properties.removed = "0000-00-00 00:00:00" AND
                css_properties.property_engine_name = "' . $this->database()->real_escape_string($engine) . '"
            ORDER BY
                css_properties.property_name ASC');

        if ($result === false) {
            Error('CSSProperties: Unable to fetch existing properties from the database for ' . $engine . '.');
            return false;
        }

        $properties = array();
        while ($row = $result->fetch_assoc())
            $properties[$row['property_name']] = $row['property_id'];

        return $properties;
    }

    // Loads the contents of |$location| and parses it as if it were a WebKit-styled list of
    // supported properties (e.g. lines starting with letters).
    private function loadSwitchesFromWebKitList($location) {
        $contents = @ file_get_contents($location);
        if ($contents === false) {
            Error('CSSProperties: Unable to download a CSS property definition file (' . $location . ').');
            return false;
        }

        $properties = array();
        foreach (explode(PHP_EOL, $contents) as $line) {
            $line = trim($line);
            if (!strlen($line) || substr($line, 0, 1) == '/' || substr($line, 0, 1) == '#')
                continue;

            $property = preg_replace('/\s.*$/s', '', $line);
            if (substr($property, 0, 10) == '-internal-')
                continue;

            $properties[$property] = 0;
        }

        ksort($properties);
        return $properties;
    }

    // Loads the contents of |$location| and parses it as if it were a Gecko-styled list of
    // supported properties (e.g. the line following a CSS_PROP_* definition).
    private function loadSwitchesFromGeckoList($location) {
        $contents = @ file_get_contents($location);
        if ($contents === false) {
            Error('CSSProperties: Unable to download a CSS property definition file (' . $location . ').');
            return false;
        }

        $properties = array();
        $contents = explode(PHP_EOL, $contents);

        while (($line = array_shift($contents)) !== null) {
            $line = trim($line);
            if (!strlen($line) || substr($line, 0, 9) != 'CSS_PROP_' || substr($line, -1) != '(')
                continue;

            $property = trim(array_shift($contents), ' ,');
            if (substr($property, 0, 3) == '-x-')
                continue;

            $properties[$property] = 0;
        }

        ksort($properties);
        return $properties;
    }

    // Loads the contents of |$filename| from the current directory and places it in an
    // associative array. Useful for engines which we can't update automatically.
    private function loadSwitchesFromFile($filename) {
        $absolute = __DIR__ . '/' . $filename;
        if (!file_exists($absolute) || !is_readable($absolute)) {
            Error('CSSProperties: Unable to read property names from local file "' . $filename . '".');
            return false;
        }

        $properties = array();
        foreach (file($absolute) as $line) {
            $line = trim($line);
            if (!strlen($line) || substr($line, 0, 1) == '#')
                continue;

            $properties[$line] = 0;
        }

        ksort($properties);
        return $properties;
    }
};

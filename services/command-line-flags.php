<?php
// Copyright 2016 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/framework/Database.php';

$condition = 'removed IS NULL';

if (array_key_exists('date', $_GET) && strlen($_GET['date']) === 10) {
    $timestamp = strtotime($_GET['date'] . ' 00:00:00');
    if ($timestamp !== false) {
        $date = date('Y-m-d', $timestamp) . ' 00:00:00';
        $condition = 'added < "' . $date . '" AND (removed IS NULL OR removed >= "' . $date . '")';
    }
}

$database = new Database();
$result = $database->query('
    SELECT
        switch_id,
        switch_name,
        switch_description,
        switch_internal,
        switch_conditions,
        switch_sourcepath,
        removed
    FROM
        chromium_switches
    WHERE
        ' . $condition . '
    ORDER BY
        switch_name ASC');

$flags = [];

while ($result !== false && $flag = $result->fetch_assoc())
    $flags[] = $flag;

$database->close();

echo json_encode($flags);

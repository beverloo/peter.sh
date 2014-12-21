<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

require_once __DIR__ . '/../services/framework/Database.php';

if (!isset ($_GET['flag']) || !isset ($_GET['project']) || !isset ($_GET['revision']) || !isset ($_GET['selected']) ||
    !is_numeric ($_GET['flag']) || !is_numeric ($_GET['project']) || strlen($_GET['revision']) != 40) {
  die('Invalid request.');
}

if ($_GET['flag'] != Configuration::$controlKey)
  exit;

$flag = intval($_GET['flag'], 10);
$project = intval($_GET['project'], 10);
$selected = $_GET['selected'] == 'true';

$database = new Database();

$revision = $database->real_escape_string($_GET['revision']);
$insertionStatement = $database->prepare('
    INSERT INTO
        tracking_flagged
        (revision_project_id, revision_sha, revision_date)
    VALUES
        (?, ?, (SELECT revision_date FROM tracking_revisions WHERE project_id = ? AND revision_sha = ?))');

$removalStatement = $database->prepare('
    DELETE FROM
        tracking_flagged
    WHERE
        revision_project_id = ? AND
        revision_sha = ?
    LIMIT
        1');

if ($selected) {
    $insertionStatement->bind_param('isis', $project, $revision, $project, $revision);
    if (!$insertionStatement->execute())
        echo $insertionStatement->error;
} else {
    $removalStatement->bind_param('is', $project, $revision);
    if (!$removalStatement->execute())
        echo $removalStatement->error;
}

$database->close();

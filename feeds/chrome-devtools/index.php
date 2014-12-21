<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

require_once __DIR__ . '/../../services/framework/Database.php';
require_once __DIR__ . '/../RssWriter.php';

$feed = new RssWriter();
$feed->setTitle('Chromium DevTools');
$feed->setDescription('Contains all revisions to the Chromium and Blink repositories mentioning "DevTools".');
$feed->setFeedLink('https://feeds.peter.sh/chrome-devtools/');
$feed->setLink('https://commits.peter.sh/');

$database = new Database();
$revisions = $database->query('
    SELECT
        tracking_devtools.revision_sha,
        UNIX_TIMESTAMP(tracking_revisions.revision_date) AS revision_date,
        tracking_revisions.message,
        tracking_authors.author_name,
        tracking_projects.project_name,
        tracking_projects.repository_view
    FROM
        tracking_devtools
    LEFT JOIN
        tracking_revisions ON tracking_revisions.project_id = tracking_devtools.revision_project_id AND
                              tracking_revisions.revision_sha = tracking_devtools.revision_sha
    LEFT JOIN
        tracking_authors ON tracking_authors.author_id = tracking_revisions.author_id
    LEFT JOIN
        tracking_projects ON tracking_projects.project_id = tracking_revisions.project_id
    ORDER BY
        tracking_devtools.revision_date DESC
    LIMIT
        30');

while ($revisions !== false && $revision = $revisions->fetch_assoc()) {
    $message = preg_split('/[\n\r]+/', $revision['message'], 0, PREG_SPLIT_NO_EMPTY);
    $description = $revision['project_name'] . ' (' . substr($revision['revision_sha'], 0, 7) . ') by ' . $revision['author_name'];
    $link = $revision['repository_view'] . $revision['revision_sha'];

    $feed->addArticle(array(
        'title'         => array_shift($message),
        'description'   => $description,
        'link'          => $link,
        'date'          => $revision['revision_date']
    ));
}

$feed->render();

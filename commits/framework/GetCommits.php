<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

$database = new Database();

// @param $start_date ("YYYY-MM-DD") - First day to return commits for.
// @param $end_date ("YYYY-MM-DD") - Last day to return commits for.
function GetCommits($start_date, $end_date, $uncheckedProjects) {
    global $database;

    $projects = array();
    foreach ($uncheckedProjects as $project) {
        if (is_numeric($project))
            $projects[] = $project;
    }

    $commits = $database->query('
        SELECT
            tracking_revisions.revision_sha,
            tracking_revisions.revision_date,
            tracking_revisions.message,
            tracking_authors.author_name,
            tracking_projects.project_name,
            tracking_projects.repository_view
        FROM
            tracking_flagged
        LEFT JOIN
            tracking_revisions ON tracking_revisions.project_id = tracking_flagged.revision_project_id AND
                                  tracking_revisions.revision_sha = tracking_flagged.revision_sha
        LEFT JOIN
            tracking_authors ON tracking_authors.author_id = tracking_revisions.author_id
        LEFT JOIN
            tracking_projects ON tracking_projects.project_id = tracking_revisions.project_id
        WHERE
            DATE(tracking_flagged.revision_date) >= "' . $start_date . '" AND
            DATE(tracking_flagged.revision_date) <= "' . $end_date . '" AND
            tracking_flagged.revision_project_id IN (' . implode(', ', $projects) . ')
        ORDER BY
            tracking_flagged.revision_date DESC');

    if ($commits === false || $commits->num_rows == 0)
        die('Unable to read the commits from the database.');

    $selection = array();
    while ($row = $commits->fetch_assoc()) {
        $selection[] = array(
            'revision_sha'      => $row['revision_sha'],
            'revision_date'     => $row['revision_date'],
            'url'               => $row['repository_view'] . $row['revision_sha'],

            'project'           => $row['project_name'],

            'author'            => $row['author_name'],
            'message'           => $row['message']
        );
    }

    return $selection;
}

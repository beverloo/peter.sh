<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

class ProjectList {
  public static function LoadFromDatabase($database) {
    $projects = $database->query('
      SELECT
        tracking_projects.project_id,
        tracking_projects.project_name,
        tracking_projects.repository_view
      FROM
        tracking_projects
      ORDER BY
        tracking_projects.project_id ASC');

    $project_list = array();
    while ($projects !== false && $row = $projects->fetch_assoc()) {
      $project_list[] = array(
        'id'          => $row['project_id'],
        'name'        => $row['project_name'],
        'viewvc'      => $row['repository_view']
      );
    }

    return $project_list;
  }
};
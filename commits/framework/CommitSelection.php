<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

class CommitSelection implements IteratorAggregate {
  private $commits;

  // ---------------------------------------------------------------------------

  // Selects commits following |$constraints| from |$database|.
  public static function Select(Database $database, SelectionConstraints $constraints, $flag) {
    $query  = self::QueryBase($flag);
    $query .= '
      FROM
        tracking_revisions
      LEFT JOIN
        tracking_authors ON tracking_authors.author_id = tracking_revisions.author_id
      ' . self::FlaggedJoinStatement($flag) . '
      WHERE
        ' . implode(' AND ', $constraints->constraints()) . '
      ORDER BY
        ' . $constraints->orderField() . ' ' . $constraints->order() . '
      LIMIT
        ' . $constraints->limit();

    return self::SelectCommitQuery($database, $query);
  }

  // SELECT portion of the query which should be selected.
  private static function QueryBase($flag) {
    return '
      SELECT
        tracking_revisions.revision_sha,
        tracking_revisions.revision_date,
        tracking_authors.author_name,
        tracking_revisions.project_id,
        tracking_revisions.message' .
        ($flag === false ? '1 AS flagged' : ', tracking_flagged.revision_project_id AS flagged');
  }

  // JOIN portion of the query depending on whether a |$flag| key has been set.
  private static function FlaggedJoinStatement($flag) {
    if ($flag === false)
      return '';

    return '
      LEFT JOIN
        tracking_flagged ON tracking_flagged.revision_project_id = tracking_revisions.project_id AND 
                            tracking_flagged.revision_sha = tracking_revisions.revision_sha';
  }

  // Constructs an instance of the CommitSelection class following the results of |$query|.
  private static function SelectCommitQuery(Database $database, $query) {
    $result = $database->query($query);
    $commits = array();

    while ($result !== false && $commit = $result->fetch_assoc()) {
      $commits[] = array(
        'hash'      => $commit['revision_sha'],
        'date'      => $commit['revision_date'],
        'author'    => $commit['author_name'],
        'project'   => $commit['project_id'],
        'message'   => $commit['message'],
        'flagged'   => $commit['flagged'] !== null
      );
    }

    return new CommitSelection($commits);
  }

  // ---------------------------------------------------------------------------

  private function __construct($commits) {
    $this->commits = $commits;
  }

  public function commits() {
    return $this->commits;
  }

  public function getIterator() {
    return new ArrayIterator($this->commits);
  }
};

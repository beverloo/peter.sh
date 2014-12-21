<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

class SelectionConstraints {
  private $constraints = array();
  private $orderField = 'tracking_revisions.revision_date';
  private $order = 'DESC';
  private $tracker = false;
  private $limit = 5000;

  private $database;

  public function __construct($database) {
    $this->database = $database;
  }

  public function setEarliestCommitDate($date) {
    $date = strtotime($date);
    if ($date !== false)
      $this->constraints['date_from'] = 'tracking_revisions.revision_date >= "' . date('Y-m-d H:i:s', $date) . '"';
  }

  public function setLatestCommitDate($date) {
    $date = strtotime($date);
    if ($date !== false)
      $this->constraints['date_max'] = 'tracking_revisions.revision_date <= "' . date('Y-m-d H:i:s', $date) . '"';
  }

  public function setAuthors($authorsString) {
    $authors = preg_split('/,/', $authorsString, 0, PREG_SPLIT_NO_EMPTY);
    if (!count($authors))
      return;

    $authorIds = array();
    $authorList = AuthorList::FromDatabase($this->database);

    foreach ($authors as $author) {
      foreach ($authorList->find($author) as $authorId)
        $authorIds[$authorId] = 1;
    }

    if (!count($authorIds))
      return;

    $this->constraints['authors'] = 'tracking_revisions.author_id IN (' . implode(', ', array_keys($authorIds)) . ')';
  }

  public function setRequireFlagged($required = true) {
    if ($required === false && array_key_exists('flagged', $this->constraints)) {
      unset ($this->constraints['flagged']);
      return;
    }

    if ($required)
      $this->constraints['flagged'] = 'tracking_flagged.revision_project_id IS NOT NULL';
  }

  public function setProjects($uncheckedProjects) {
    $projects = array();
    foreach (explode(',', $uncheckedProjects) as $project) {
      if (is_numeric($project))
        $projects[] = $project;
    }

    if (!count($projects))
      return;

    $this->constraints['projects'] = 'tracking_revisions.project_id IN (' . implode(', ', $projects) . ')';
  }

  public function setOrderField($field) {
    $this->orderField = $field;
  }

  public function setOrder($order) {
    $this->order = $order;
  }

  public function setTracker($trackerId) {
    $this->tracker = $trackerId;
  }


  public function constraints() {
    return array_values($this->constraints);
  }

  public function orderField() {
    return $this->orderField;
  }

  public function order() {
    return $this->order;
  }

  public function tracker() {
    return $this->tracker;
  }

  public function limit() {
    return $this->limit;
  }


  public function pageTitle() {
    return 'Commits';
  }
};

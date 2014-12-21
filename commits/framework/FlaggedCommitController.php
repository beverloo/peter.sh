<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

class FlaggedCommitController {
  private $database;
  private $flag;

  public function __construct($database) {
    $this->database = $database;
    $this->flag = null;
  }

  public function setFlag($flag) {
    $this->flag = $flag;
  }

  public function flag() {
    return $this->flag;
  }

  public function findMostRecentFlagTime() {
    if ($this->flag === null || !is_numeric($this->flag))
      return false;

    $latestFlagDateQuery = $this->database->query('
      SELECT
        MAX(revision_date) AS latest_flag_date
      FROM
        tracking_flagged');
 
    if ($latestFlagDateQuery === false || $latestFlagDateQuery->num_rows == 0)
      return false;

    $latestFlagDate = $latestFlagDateQuery->fetch_assoc();
    return strtotime($latestFlagDate['latest_flag_date']);
  }

};
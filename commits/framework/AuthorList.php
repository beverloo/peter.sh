<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

class AuthorList {
  private static $instance = false;

  public static function FromDatabase($database) {
    if (self::$instance !== false)
      return self::$instance;

    $query = $database->query('
      SELECT
        tracking_authors.author_id,
        tracking_authors.author_name
      FROM
        tracking_authors
      WHERE
        tracking_authors.author_name <> ""
      ORDER BY
        tracking_authors.author_name ASC');

    $authors = array();
    $authorIds = array();

    while ($query !== false && $row = $query->fetch_assoc()) {
      $authors[$row['author_name']] = $row['author_id'];
      $authorIds[$row['author_id']] = 1;
    }
    
    return new AuthorList($authors, $authorIds);
  }

  // ---------------------------------------------------------------------------

  private $authors;
  private $authorIds;

  public function __construct($authors, $authorIds) {
    $this->authors = $authors;
    $this->authorIds = $authorIds;
  }

  public function find($query) {
    if (is_numeric($query) && isset($this->authorIds[$query]))
      return array($query); // fast path for Id input.

    if (filter_var($query, FILTER_VALIDATE_EMAIL) && array_key_exists($query, $this->authors))
      return array($this->authors[$query]); // fast path for e-mail input.

    $results = array();
    foreach ($this->authors as $authorName => $authorId) {
      if (strpos($authorName, $query) !== false)
        $results[] = $authorId;
    }

    return $results;
  }
};

<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

class RepositoryTracker extends Service {
    // Registers the polling task which we'll want to execute a few times per hour to
    // fetch the latest changes committed to repositories we care about. We also run a
    // 
    public static function RegisterTasks(ServiceManager $manager) {
        $manager->scheduleTask('30 minutes', array(__CLASS__, 'updateRepositories'));
        $manager->scheduleTask('1 day', array(__CLASS__, 'aggregateRepositoryStats'));
    }

    // Returns the current state of the repository tracker service. Beyond the default
    // metadata, we also include the available repositories and the date of the most
    // recent commit which was made to them.
    public static function QueryState(TaskEnvironment $env) {
        $result = $env->database()->query('
            SELECT
                tracking_projects.project_name,
                tracking_projects.repository_view,
                tracking_projects.repository_max_silence,
                tracking_revisions.revision_sha,
                UNIX_TIMESTAMP(tracking_revisions.revision_date) AS revision_date,
                tracking_revisions.message
            FROM
                tracking_projects
            LEFT JOIN
                tracking_revisions ON tracking_revisions.project_id = tracking_projects.project_id AND
                                      tracking_revisions.revision_sha = 
                                      (
                                          SELECT
                                              revision_sha
                                          FROM
                                              tracking_revisions
                                          WHERE
                                              project_id = tracking_projects.project_id
                                          ORDER BY
                                              revision_date DESC
                                          LIMIT
                                              1
                                      )
            ORDER BY
                tracking_projects.project_name ASC');

        $subtasks = array();
        $state = ServiceState::Good;
        $warnings = 0;

        while ($result !== false && $row = $result->fetch_assoc()) {
            $url = $row['repository_view'] . $row['revision_sha'];
            $title = htmlspecialchars(trim(strstr($row['message'], PHP_EOL, true)));
            $text = substr($row['revision_sha'], 0, 7);

            if (((time() - $row['revision_date']) / 3600) > $row['repository_max_silence']) {
                $state = ServiceState::Warning;
                $warnings++;
            }

            $subtasks[] = array(
                'name'      => $row['project_name'],
                'date'      => $row['revision_date'],
                'value'     => '<a href="' . $url . '" title="' . $title . '">' . $text . '</a>'
            );
        }

        if (!count($subtasks) || $warnings >= 3)
            $state = ServiceState::Error;

        return array(
            'name'          => 'Repository tracker',
            'description'   => 'Tracks all commits to the Blink, Chromium, Skia and v8 repositories and stores them in a MySQL database.',
            'state'         => $state,
            'subtasks'      => $subtasks
        );
    }

    // ---------------------------------------------------------------------------------------------

    // Associative array mapping author e-mail addresses to their IDs.
    private $m_authors;

    // Statement used to create new authors in the database. Will be lazily created on first use.
    private $m_authorStatement;

    // TASK: updateRepositories
    //
    // Updates the stored commit information about the repositories listed in the "projects" table
    // in our MySQL database. Only git repositories will be considered for this purpose.
    public function updateRepositories() {
        $projects = $this->loadProjects();
        if (count($projects) == 0)
            return;

        $this->m_authors = $this->loadAuthors();

        foreach ($projects as $project)
            $this->updateProject($project);
    }

    // Synchronizes the status of |$project| using a live version of the repository, as defined in
    // the configuration for this service.
    private function updateProject($project) {
        $revisions = $this->loadNewRevisions($project);
        if (count($revisions) == 0)
            return;  // no new commits or an error.

        $statement = $this->database()->prepare('
            INSERT INTO
                tracking_revisions
                (revision_sha, revision_date, author_id, project_id, message)
            VALUES
                (?, FROM_UNIXTIME(?), ?, ?, ?)');

        if ($statement === false) {
            Error('RepositoryTracker: Unable to prepare a database statement for insertion in tracking_revisions.');
            return;
        }

        $inserted = 0;
        foreach ($revisions as $revision) {
            $revision_sha = strtolower($revision['hash']);
            $revision_date = strtotime($revision['date']);
            $author_id = $this->findOrCreateAuthor($revision['author']);
            $message = $revision['message'];

            $statement->bind_param('ssiis', $revision_sha, $revision_date, $author_id, $project['id'], $message);
            if ($statement->execute() === false) {
                Error('RepositoryTracker: Unable to insert a new commit in the database (' . $project['name'] . ', revision ' . $revision_sha . ').');
                Error('RepositoryTracker: Error: "' . $statement->error . '".');
            } else
                $this->didStoreCommit($project['id'], $revision_sha, $revision_date, $message);

            ++$inserted;
        }

        Info('RepositoryTracker: Wrote ' . $inserted . ' new revisions for repository ' . $project['name'] . '.');
    }

    // Called when a new commit has been written to the database. If |$message| contains certain
    // flags, a second entry may have to be written to the database as well.
    //
    // This functionality is used by the Chrome DevTools RSS feed, and thereby the DevTools team,
    // independent Twitter feeds and developers.
    private function didStoreCommit($project_id, $revision_sha, $revision_date, $message) {
        // TODO(Peter): Make this more generic if there's sufficient benefit.
        $triggers = array('DevTools', 'Dev Tools');

        $relevant = false;
        foreach ($triggers as $trigger) {
            if (strpos($message, $trigger) !== false)
                $relevant = true;
        }

        if (!$relevant)
            return;

        $statement = $this->database()->prepare('
            INSERT INTO
                tracking_devtools
                (revision_project_id, revision_sha, revision_date)
            VALUES
                (?, ?, FROM_UNIXTIME(?))');

        if ($statement === false) {
            Error('RepositoryTracker: Unable to prepare a database statement for insertion in tracking_devtools.');
            return;
        }

        $statement->bind_param('isi', $project_id, $revision_sha, $revision_date);
        $statement->execute();
    }

    // ---------------------------------------------------------------------------------------------

    // TASK: aggregateRepositoryStats
    //
    // Generates a JSON overview of all commits which have landed so far, so that it can be displayed
    // on a convenient overview page dating back to the beginnings of time.
    public function aggregateRepositoryStats() {
        $statistics = array(
            '@projects'     => array(),
            '@revisions'    => 0
        );

        $projects = $this->loadProjects();
        if ($projects === false)
            return;
        
        $emptyProject = array('@revisions' => 0, '@authors' => 0);
        foreach ($projects as $project) {
            $statistics['@projects'][$project['id']] = $project['name'];
            $emptyProject[$project['id']] = 0;
        }

        // First we copy over the existing commits in a temporary table, which will significantly
        // speed up any further operation we'll be doing on the data.
        $this->database()->query('
            CREATE TEMPORARY TABLE
                tracking_aggregate
            (
                revision_sha CHAR(40),
                revision_year INT UNSIGNED,
                revision_month INT UNSIGNED,
                revision_week INT UNSIGNED,
                author_id INT UNSIGNED,
                project_id INT UNSIGNED
            ) ENGINE MEMORY');

        $this->database()->query('
            INSERT INTO
                tracking_aggregate
            SELECT
                tracking_revisions.revision_sha,
                YEAR(tracking_revisions.revision_date),
                MONTH(tracking_revisions.revision_date),
                WEEK(tracking_revisions.revision_date, 0),
                tracking_revisions.author_id,
                tracking_revisions.project_id
            FROM
                tracking_revisions
            WHERE
                YEAR(tracking_revisions.revision_date) >= 2008');
        
        // Gather the weekly information and aggregates. This is the most detailed granularity.
        $weekly = $this->database()->query('
            SELECT
                tracking_aggregate.project_id,
                tracking_aggregate.revision_year,
                tracking_aggregate.revision_week,
                COUNT(tracking_aggregate.revision_sha) AS revision_count,
                COUNT(DISTINCT tracking_aggregate.author_id) AS author_count
            FROM
                tracking_aggregate
            GROUP BY
                tracking_aggregate.project_id,
                tracking_aggregate.revision_year,
                tracking_aggregate.revision_week
            ORDER BY
                tracking_aggregate.revision_year DESC,
                tracking_aggregate.revision_week DESC');

        if ($weekly === false) {
            Error('RepositoryTracker: Unable to read the weekly commit information aggregates.');
            return;
        }

        while ($stats = $weekly->fetch_assoc()) {
            $year = (int) $stats['revision_year'];
            $week = (int) $stats['revision_week'];

            if (!array_key_exists($year, $statistics))
                $statistics[$year] = array('@revisions' => 0, '@authors' => 0);
            if (!array_key_exists($week, $statistics[$year]))
                $statistics[$year][$week] = $emptyProject;

            $statistics[$year][$week][$stats['project_id']] = array(
                'revisions'     => (int) $stats['revision_count'],
                'authors'       => (int) $stats['author_count']
            );

            $statistics[$year][$week]['@revisions'] += $stats['revision_count'];
            $statistics[$year]['@revisions'] += $stats['revision_count'];
            $statistics['@revisions'] += $stats['revision_count'];
        }

        // Add in the number of unique authors for each week. We cannot simply add the numbers we
        // get in the query above, since people may commit to multiple repositories.
        $authors_weekly = $this->database()->query('
            SELECT
                tracking_aggregate.revision_year,
                tracking_aggregate.revision_week,
                COUNT(DISTINCT tracking_aggregate.author_id) AS author_count
            FROM
                tracking_aggregate
            GROUP BY
                tracking_aggregate.revision_year,
                tracking_aggregate.revision_week');

        if ($authors_weekly === false) {
            Error('RepositoryTracker: Unable to read the weekly author information aggregates.');
            return;
        }

        while ($stats = $authors_weekly->fetch_assoc()) {
            $year = (int) $stats['revision_year'];
            $week = (int) $stats['revision_week'];

            $statistics[$year][$week]['@authors'] = (int) $stats['author_count'];
        }

        // Finally, get the first and the last commit from the database.
        $commit_boundaries = $this->database()->query('
            SELECT
                MIN(revision_date) AS first_revision,
                MAX(revision_date) AS last_revision
            FROM
                tracking_revisions');

        if ($commit_boundaries === false) {
            Error('RepositoryTracker: Unable to read the revision boundaries for statistic aggregates.');
            return;
        }

        $boundaries = $commit_boundaries->fetch_assoc();

        $statistics['@first_revision'] = $boundaries['first_revision'];
        $statistics['@last_revision'] = $boundaries['last_revision'];

        // Finally, write these statistics to a file so that any user can access it.
        file_put_contents(__DIR__ . '/../../data/commit_statistics.json',
            json_encode($statistics));
    }

    // ---------------------------------------------------------------------------------------------

    // Loads a list of the new revisions which have landed since |$project.rev| happened. The actual
    // revisions will be loaded from a remote location.
    private function loadNewRevisions($project) {
        $serviceUrl = Configuration::$chromiumRepoTool . '?repository=' . $project['path'];
        $logRequest = $serviceUrl . '&command=log&branch=' . $project['branch'] . '&since=' . $project['rev'];

        $logData = @ file_get_contents($logRequest);
        if ($logData === false) {
            Error('RepositoryTracker: Unable to fetch logs for repository ' . $project['name'] . '.');
            return array();
        }

        $log = json_decode($logData, true);
        if ($log === null) {
            Error('RepositoryTracker: Unable to decode logs for repository ' . $project['name'] . '.');
            Error('RepositoryTracker: Error: ' . substr($logData, 0, 256));
            return array();
        }

        return $log;
    }

    // Loads a list of authors known to the system.
    private function loadAuthors() {
        $result = $this->database()->query('
            SELECT
                author_id,
                author_name
            FROM
                tracking_authors
            ORDER BY
                author_name ASC');

        if ($result === false) {
            Error('RepositoryTracker: Unable to retrieve a list of authors from the database.');
            return array();
        }

        $authors = array();
        while ($row = $result->fetch_assoc())
            $authors[$row['author_name']] = $row['author_id'];
        
        return $authors;
    }

    // Loads a list of projects from the database, ignoring those without a git repository.
    private function loadProjects() {
        $result = $this->database()->query('
            SELECT
                tracking_projects.project_id,
                tracking_projects.project_name,
                tracking_projects.project_path,
                tracking_projects.project_branch,
                (
                    SELECT
                        tracking_revisions.revision_sha
                    FROM
                        tracking_revisions
                    WHERE
                        tracking_revisions.project_id = tracking_projects.project_id
                    ORDER BY
                        tracking_revisions.revision_date DESC
                    LIMIT
                        1
                ) AS revision_sha
            FROM
                tracking_projects
            WHERE
                project_path <> ""');

        if ($result === false) {
            Error('RepositoryTracker: Unable to retrieve a list of projects from the database.');
            return array();
        }

        $projects = array();
        while ($row = $result->fetch_assoc()) {
            $projects[] = array(
                'id'        => $row['project_id'],
                'name'      => $row['project_name'],
                'path'      => $row['project_path'],
                'branch'    => $row['project_branch'],
                'rev'       => $row['revision_sha']
            );
        }

        if (count($projects) == 0)
            Error('RepositoryTracker: No projects have been specified in the database.');

        return $projects;
    }

    // Returns the Id associated with this e-mail address, or creates it in the database if none was
    // associated with it as of yet.
    private function findOrCreateAuthor($author) {
        $author = strtolower($author);

        if (array_key_exists($author, $this->m_authors))
            return $this->m_authors[$author];

        if ($this->m_authorStatement === null) {
            $this->m_authorStatement = $this->database()->prepare('
                INSERT INTO
                    tracking_authors
                    (author_name)
                VALUES
                    (?)');

            if ($this->m_authorStatement === false) {
                Error('RepositoryTracker: Unable to prepare a database statement for inserting authors.');
                return 0;
            }
        }

        $this->m_authorStatement->bind_param('s', $author);
        if ($this->m_authorStatement->execute() !== true) {
            Error('RepositoryTracker: Unable to create an author row for "' . $author . '".');
            return 0;
        }

        $authorId = $this->database()->insert_id;

        $this->m_authors[$author] = $authorId;
        return $authorId;
    }
};

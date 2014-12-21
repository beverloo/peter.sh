<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

require_once __DIR__ . '/../services/framework/Database.php';

require_once __DIR__ . '/framework/AuthorList.php';
require_once __DIR__ . '/framework/CommitSelection.php';
require_once __DIR__ . '/framework/FlaggedCommitController.php';
require_once __DIR__ . '/framework/ProjectList.php';
require_once __DIR__ . '/framework/SelectionConstraints.php';

$database = new Database();
$constraints = new SelectionConstraints($database);
$flagged = new FlaggedCommitController($database);
$projects = ProjectList::LoadFromDatabase($database);

// The following options are available for selecting a range of commits. Some
// may be used in combination with other options, others may not. Options to
// this script will be accepted as either POST or GET variables.
//
// "from_date"       Earliest date to select commits from (YYYY-MM-DD).
// "to_date"         Latest date to select commits from (YYYY-MM-DD).
// "author"          E-mail address of the commit's author.
// "reverse"         Display commits in reversed (ascending) order.
// "tracker"         Id of the tracker from which commits can be selected.
// "since"           Display commits since the given date or text.
// "projects"        List of project Ids from which to select commits.
//

if (isset ($_REQUEST['from_date']))
  $constraints->setEarliestCommitDate($_REQUEST['from_date'] . ' 00:00:00');

if (isset ($_REQUEST['to_date']))
  $constraints->setLatestCommitDate($_REQUEST['to_date'] . ' 23:59:59');

if (isset ($_REQUEST['author']))
  $constraints->setAuthors($_REQUEST['author']);

if (isset ($_REQUEST['reverse']))
  $constraints->setOrder('ASC');

if (isset ($_REQUEST['tracker']))
  $constraints->setTracker($_REQUEST['tracker']);

if (isset ($_REQUEST['since'])) {
  $since = strtotime(urldecode($_REQUEST['since']));
  if ($since !== false) {
    $constraints->setEarliestCommitDate(date('Y-m-d 00:00:00', $since));
    $constraints->setLatestCommitDate(date('Y-m-d H:i:s'));
  }
}

if (isset ($_REQUEST['projects']))
  $constraints->setProjects($_REQUEST['projects']);

// In order for selected commits to persist, it's possible to use the "flag"
// option to supply a numeric Id. The "since_flag" option is available to only
// display commits which were made since the last set flag.
//
// "flag"            Numeric Id for identifying a set of persistent selections.
// "since_flag"      Limit selected commits to those made since the last flag.

if (isset ($_REQUEST['flag']) && is_numeric($_REQUEST['flag'])) {
  $flagged->setFlag(intval($_REQUEST['flag']));

  if (isset ($_REQUEST['since_flag'])) {
    $most_recent_flag = $flagged->findMostRecentFlagTime();
    if ($most_recent_flag !== false) {
      $constraints->setEarliestCommitDate(date('Y-m-d H:i:s', $most_recent_flag));
      $constraints->setLatestCommitDate(date('Y-m-d H:i:s'));
    }
  }
}

// Ensure that at least one constraint has been set, because otherwise we'll end
// up selecting all hundreds of thousands of commits in the database.
if (count($constraints->constraints()) == 0)
  $constraints->setEarliestCommitDate(date('Y-m-d H:i:s', time() - 7 * 86400));

// Select the commits from the database based on the |$constraints|. The
// returned object may be used as an iterator.
$commits = CommitSelection::Select($database, $constraints, $flagged->flag());

// Hard-coded array of the filters which should be enabled for the selection
// list. At some point I may want to make this controllable using settings.
$filters = array(
  'FlagRevertFilter',
  'RemoveGitDependencySyncFilter',
  'RemoveV8TagsFilter',
  'RemoveSkiaRebaselineFilter',
  'RemoveSkiaHousekeeperFilter',
);
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title><?php echo $constraints->pageTitle(); ?></title>
    <link rel="stylesheet" href="/style/selection.css" />
  </head>
  <body>
    <template id="commit-template">
      <div class="commit">
        <div class="revision"></div>
        <div class="author"></div>
        <div class="date"></div>
        <div class="message"></div>
        <div class="state">
          <input type="checkbox" />
        </div>
      </div>
    </template>
    <div id="header"></div>
    <div id="commits">
      <!-- commits will appear here. -->
    </div>
    <script src="/scripts/selection.js"></script>
    <script>
<?php
foreach ($projects as $project)
  echo '      Project.fromId(' . $project['id'] . ').initialize("' . $project['name'] . '", "' . $project['viewvc'] . '");' . PHP_EOL;
?>

      // -----------------------------------------------------------------------
      // Commit data received from the selector.

      var commits = <?php echo json_encode($commits->commits()); ?>;

      // -----------------------------------------------------------------------

      var commitList = new CommitList();
<?php
foreach ($filters as $filter)
  echo '      commitList.addFilter(new ' . $filter . '());' . PHP_EOL;
?>
      commitList.add(commits);

      var stateManager = new StateManager(<?php echo $flagged->flag(); ?>);

      var renderer = new Renderer(document.getElementById('commit-template'));
      renderer.onToggleCommit = function(project, revision, selected) {
        stateManager.onSelectionChanged(project, revision, selected);
      };

      renderer.render(commitList,
                      document.getElementById('header'),
                      document.getElementById('commits'));
    </script>
  </body>
</html>
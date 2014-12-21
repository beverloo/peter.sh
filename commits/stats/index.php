<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

define('DATA_FILENAME', __DIR__ . '/../../services/data/commit_statistics.json');

$version = trim(file_get_contents(__DIR__ . '/../../VERSION'));

$projects = '';
$data = false;

if (file_exists(DATA_FILENAME)) {
  $data = json_decode(file_get_contents(DATA_FILENAME), true);

  $project_list = array_values($data['@projects']);
  $last_project = array_pop($project_list);
  $projects = implode(', ', $project_list) . ' and ' . $last_project;
}

?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
    <title>Commit statistics from the Chromium-related repositories</title>
    <link rel="stylesheet" href="//fonts.googleapis.com/css?family=Roboto:400,700,400italic" />
    <link rel="stylesheet" href="//static.peter.sh/style/layout.css" />
    <link rel="stylesheet" href="//static.peter.sh/style/desktop.css" media="screen and (min-device-width: 768px)" />
    <link rel="stylesheet" href="//static.peter.sh/style/s-commits.css" />
    <link rel="stylesheet" href="/style/stats.css" />
    <link rel="alternate" type="application/rss+xml" href="/?rss" />
    <link rel="icon" href="/images/chromium.png" />
  </head>
  <body class="blue">
    <header>
      <div class="header-overlay"></div>
      <h1>
        Commit statistics for <?php echo $projects; ?> 
        <a class="twitter" href="https://twitter.com/beverloo"></a>
      </h1>
    </header>

<?php
if ($data === false) {
?>
    <section>
      <p class="notice">
        The aggregated commit data is not available. I should already have been notified, but please <a href="mailto:peter@lvp-media.com">nag me</a> if this error persists. Sorry!
      </p>
    </section>
<?php
} else {
  $count = number_format($data['@revisions']);
  $first = date('Y', strtotime($data['@first_revision']));
  $last = date('Y', strtotime($data['@last_revision']));
  $updated = date('l, F jS, Y', strtotime($data['@last_revision']));
?>
    <section>
      <h2>Statistics over <?php echo $count; ?> revisions between <?php echo $first; ?> and <?php echo $last; ?>.</h2>
      <p>
        Displaying 2008 and later. This data was last updated on <?php echo $updated; ?>.
      </p>
    </section>

<?php
    foreach ($data as $key => $statistics) {
        if (substr($key, 0, 1) == '@')
            continue;

        $count = number_format($statistics['@revisions']);

?>
    <section>
      <h2>Revision statistics over <?php echo $key; ?> (<?php echo $count; ?> revisions).</h2>
      <table class="data-table">
        <thead>
          <tr>
            <td>Week</td>
<?php
        foreach ($data['@projects'] as $project) {
            echo '            <td colspan="2">' . $project . '</td>' . PHP_EOL;
        }
?>
            <td colspan="2">Combined</td>
          </tr>
          <tr>
            <td></td>
<?php
        foreach ($data['@projects'] as $project) {
            echo '            <td>Revisions</td>' . PHP_EOL;
            echo '            <td>Authors</td>' . PHP_EOL;
        }
?>
            <td>Revisions</td>
            <td>Authors</td>
          </tr>
        </thead>
        <tbody>
<?php
        foreach ($statistics as $week => $projects) {
            if (substr($week, 0, 1) == '@')
               continue;

?>
          <tr>
            <td><?php echo $key . '-' . $week; ?></td>
<?php
            foreach ($projects as $project_id => $numbers) {
                if (substr($project_id, 0, 1) == '@')
                    continue;

                echo '            <td>' . number_format($numbers['revisions']) . '</td>' . PHP_EOL;
                echo '            <td>' . number_format($numbers['authors']) . '</td>' . PHP_EOL;
            }

?>
            <td><?php echo number_format($projects['@revisions']); ?></td>
            <td><?php echo number_format($projects['@authors']); ?></td>
          </tr>
<?php
        }

?>
        </tbody>
      </table>
    </section>
<?php
    }

}
?>
    <footer>
      Curated by <a href="http://peter.sh/">Peter Beverloo</a>. This page lives in the <a href="http://creativecommons.org/publicdomain/zero/1.0/">public domain</a>.
      <aside>
        <a href="https://github.com/beverloo/peter.sh/tree/master/commits/stats"><?php echo substr($version, 0, 7); ?></a>
      </aside>
    </footer>
    <script src="/scripts/overview.js"></script>
    <script>
      (function(i,s,o,g,r,a,m) {i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
         m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

      ga('create', 'UA-4974835-5', 'auto');
      ga('send', 'pageview');
    </script>
  </body>
</html>
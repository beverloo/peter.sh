<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

require_once __DIR__ . '/../services/framework/Database.php';
require_once __DIR__ . '/framework/GetCommits.php';

Header('Access-Control-Allow-Origin: *');

$version = trim(file_get_contents(__DIR__ . '/../VERSION'));

$database = new Database();
$commits = GetCommits($database);

if ($_SERVER['QUERY_STRING'] == 'rss') {
  $first_commit = current($commits);
  $first_date = strtotime($first_commit['revision_date']);

  Header('Content-Type: application/rss+xml');

  echo '<?xml version="1.0" encoding="UTF-8" ?>' . PHP_EOL;
?>
<rss version="2.0">
  <channel>
    <title>Highlights from recent Chromium, Blink, Skia and v8 commits</title>
    <description>This feed contains a selection from all Chromium, Blink, Skia and v8 commits, pointing out changes which might be interesting for a wider audience.</description>
    <link>https://commits.peter.sh/</link>
    <lastBuildDate><?php echo date(DateTime::RSS, $first_date); ?></lastBuildDate>
    <pubDate><?php echo date(DateTime::RSS, $first_date); ?></pubDate>
    <ttl>3600</ttl>

<?php
  foreach ($commits as $commit) {
    $message = preg_split('/[\n\r]+/', $commit['message'], 0, PREG_SPLIT_NO_EMPTY);
    $description = array_shift($message);
    $description = htmlspecialchars($description);
?>
    <item>
      <title><?php echo htmlentities($description, ENT_QUOTES); ?></title>
      <description><?php echo $commit['project'] . ' (' . substr($commit['revision_sha'], 0, 7) . ') by ' . $commit['author']; ?>.</description>
      <link><?php echo htmlentities($commit['url']); ?></link>
      <guid><?php echo htmlentities($commit['url']); ?></guid>
      <pubDate><?php echo date(DateTime::RSS, strtotime($commit['revision_date'])); ?></pubDate>
    </item>
<?php
  }
?>
  </channel>
</rss>
<?php

  exit;
}

?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
    <title>Highlights from recent Chromium, Blink, Skia and v8 commits</title>
    <link rel="stylesheet" href="//fonts.googleapis.com/css?family=Roboto:400,700,400italic" />
    <link rel="stylesheet" href="//static.peter.sh/style/layout.css" />
    <link rel="stylesheet" href="//static.peter.sh/style/desktop.css" media="screen and (min-device-width: 768px)" />
    <link rel="stylesheet" href="//static.peter.sh/style/s-commits.css" />
    <link rel="alternate" type="application/rss+xml" href="/?rss" />
    <link rel="icon" href="/images/chromium.png" />
  </head>
  <body class="blue">
    <header>
      <div class="header-overlay"></div>
      <h1>
        Highlights from recent Chromium, Blink, Skia and v8 commits
        <a class="twitter" href="https://twitter.com/beverloo"></a>
        <a class="rss" href="/?rss"></a>
      </h1>
    </header>

    <section>
<?php
$current_date = null;
foreach ($commits as $commit) {
  $date = date('l, F j, Y', strtotime($commit['revision_date']));
  if ($date != $current_date) {
    if ($current_date !== null) {
      echo '      </ol>' . PHP_EOL;
      echo '    </section>' . PHP_EOL . PHP_EOL;
      echo '    <section>' . PHP_EOL;
    }

    echo '      <h2>' . $date . '</h2>' . PHP_EOL;
    echo '      <ol>' . PHP_EOL;
    $current_date = $date;
  }

  $message = preg_split('/[\n\r]+/', $commit['message'], 0, PREG_SPLIT_NO_EMPTY);
  $description = array_shift($message);
  $description = htmlspecialchars($description);

  $author = str_replace('@chromium.org', '', $commit['author']);

  echo '        <li>' . PHP_EOL;
  echo '          <h3><a href="' . $commit['url'] . '" target="_blank">' . $description . '</a></h3>' . PHP_EOL;
  echo '          <p>' . $commit['project'] . ' (' . substr($commit['revision_sha'], 0, 7) . ') by ' . $author . '</p>' . PHP_EOL;
  echo '        </li>' . PHP_EOL;
}
?>
      </ol>
    </section>
    <footer>
      Curated by <a href="http://peter.sh/">Peter Beverloo</a>. This page lives in the <a href="http://creativecommons.org/publicdomain/zero/1.0/">public domain</a>.
      <aside>
        <a href="https://github.com/beverloo/peter.sh/tree/master/commits"><?php echo substr($version, 0, 7); ?></a>
      </aside>
    </footer>
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
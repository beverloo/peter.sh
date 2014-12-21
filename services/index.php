<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/framework/ServiceManager.php';

$serviceManager = new ServiceManager();
$state = $serviceManager->queryServiceStates();

$version = trim(file_get_contents(__DIR__ . '/VERSION'));

// Given the right "key" query parameter, tasks can be executed directly from the page.
$key = array_key_exists('key', $_GET) ? $_GET['key'] : '';

?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
    <title>Service overview for Peter.sh</title>
    <link rel="stylesheet" href="//fonts.googleapis.com/css?family=Roboto:400,700,400italic" />
    <link rel="stylesheet" href="//static.peter.sh/style/layout.css" />
    <link rel="stylesheet" href="//static.peter.sh/style/desktop.css" media="screen and (min-device-width: 768px)" />
    <link rel="stylesheet" href="//static.peter.sh/style/s-services.css" />
    <link rel="alternate" type="application/rss+xml" href="/?rss" />
    <link rel="icon" href="/images/chromium.png" />
  </head>
  <body class="green">
    <header>
      <div class="header-overlay"></div>
      <h1>
        Services running as part of <a href="https://peter.sh/">Peter.sh</a>.
        <a class="twitter" href="https://twitter.com/beverloo"></a>
      </h1>
    </header>
<?php
foreach ($state['services'] as $data) {
    echo '    <section class="state-' . $data['details']['state'] . '">' . PHP_EOL;
    echo '      <h2><span class="indicator"></span>' . $data['details']['name'] . '</h2>' . PHP_EOL;
    echo '      <p>' . PHP_EOL;
    echo '        ' . $data['details']['description'] . PHP_EOL;
    echo '      </p>' . PHP_EOL;

    if (count($data['tasks'])) {
        echo '      <ol class="tasks">' . PHP_EOL;

        foreach ($data['tasks'] as $task) {
            $execute = '';
            if ($key == Configuration::$controlKey) {
                $execute = ' <a href="/run.php?key=' . $key . '&task=' . $task['unique_id'] . '" title="Execute now!">' .
                    '<img src="//static.peter.sh/images/play-green.png" /></a>';
            }

            echo '        <li>' . PHP_EOL;
            echo '          <h3><strong>Task</strong>: ' . $task['name'] . $execute . '</h3>' . PHP_EOL;
            echo '          <p>' . PHP_EOL;
            echo '            Interval: ' . $task['interval'] . 's;' . PHP_EOL;
            echo '            last execution: ' . date('Y-m-d H:i:s', $task['last_execution']) . PHP_EOL;
            echo '          </p>' . PHP_EOL;
            echo '        </li>' . PHP_EOL;
        }

        echo '      </ol>' . PHP_EOL;
    }

    if (count($data['details']['subtasks'])) {
        echo '      <ol class="subtasks">' . PHP_EOL;

        foreach ($data['details']['subtasks'] as $subtask) {
            echo '        <li>' . PHP_EOL;
            echo '          <h3>' . $subtask['name'] . '</h3>' . PHP_EOL;
            echo '          <p>' . PHP_EOL;
            echo '            Last updated: ' . date('Y-m-d H:i:s', $subtask['date']) . ';' . PHP_EOL;
            echo '            value: ' . $subtask['value'] . PHP_EOL;
            echo '          </p>' . PHP_EOL;
            echo '        </li>' . PHP_EOL;
        }

        echo '      </ol>' . PHP_EOL;
    }

    echo '    </section>' . PHP_EOL;
}
?>
    <footer>
      Curated by <a href="http://peter.sh/">Peter Beverloo</a>. This page lives in the <a href="http://creativecommons.org/publicdomain/zero/1.0/">public domain</a>.
      <aside>
        <a href="https://github.com/beverloo/services.peter.sh"><?php echo substr($version, 0, 7); ?></a>
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
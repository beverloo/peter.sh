<?php
// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

$version = trim(file_get_contents(__DIR__ . '/../VERSION'));
$directory = __DIR__ . '/cases/';

$tests = json_decode(file_get_contents(__DIR__ . '/cases.json'), true);

$title = 'Collection of small test-cases and tools';
$file = false;

if (strlen($_SERVER['REQUEST_URI']) > 1) {
  $requested_case = trim($_SERVER['REQUEST_URI'], '/');
  $requested_file = $requested_case . '.html';

  if (array_key_exists($requested_file, $tests)) {
    $title = $tests[$requested_file]['title'];
    $file = $requested_file;
  }
}
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
    <title><?php echo $title; ?> | Peter.sh</title>
    <link rel="stylesheet" href="//fonts.googleapis.com/css?family=Roboto:400,700,400italic" />
    <link rel="stylesheet" href="//static.peter.sh/style/layout.css" />
    <link rel="stylesheet" href="//static.peter.sh/style/desktop.css" media="screen and (min-device-width: 768px)" />
    <link rel="stylesheet" href="//static.peter.sh/style/mobile.css" media="screen and (max-device-width: 767px)" />
    <link rel="stylesheet" href="//static.peter.sh/style/s-services.css" />
    <link rel="alternate" type="application/rss+xml" href="/?rss" />
    <style>
      h2 { text-indent: 0; }
    </style>
  </head>
  <body class="green">
    <header>
      <div class="header-overlay"></div>
      <h1>
        <?php echo $title; ?> 
        <a class="twitter" href="https://twitter.com/beverloo"></a>
      </h1>
    </header>
    <section>
<?php
if (!$file) {
?>
      <ol class="subtasks">
<?php
  $testsToDisplay = [];
  foreach (new DirectoryIterator($directory) as $file) {
    if ($file->isDir())
      continue;

    $filename = $file->getFilename();
    if (!array_key_exists($filename, $tests))
      continue;

    $testsToDisplay[] = [
      'url'         => '/' . substr($filename, 0, -5) . '/',
      'modified'    => $file->getMTime(),

      'title'       => $tests[$filename]['title'],
      'description' => $tests[$filename]['description']
    ];
  }

  usort($testsToDisplay, function($lhs, $rhs) {
    return strcmp($lhs['title'], $rhs['title']);
  });

  foreach ($testsToDisplay as $test) {
    $modified = date('F Y', $test['modified']);

?>
        <li>
          <h3><a href="<?php echo $test['url']; ?>"><?php echo $test['title']; ?></a></h3>
          <p>
            <?php echo $test['description']; ?> Last modified in <?php echo $modified; ?>.
          </p>
        </li>
<?php
  }
?>
      </ol>
<?php
} else {
  echo file_get_contents(__DIR__ . '/cases/' . $file);
}
?> 
    </section>
    <footer>
      Curated by <a href="http://peter.sh/">Peter Beverloo</a>. This page lives in the <a href="http://creativecommons.org/publicdomain/zero/1.0/">public domain</a>.
      <aside>
        <a href="https://github.com/beverloo/peter.sh/tree/master/services"><?php echo substr($version, 0, 7); ?></a>
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
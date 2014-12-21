<?php
Header('Content-Type: text/javascript');

$scripts = array(
  'author.js',
  'commit.js',
  'commit_list.js',
  'project.js',
  'renderer.js',
  'state_manager.js',

  // NOTE: All .js source files in the script/filters/ directory will be
  //       automatically appended to this array.
);

foreach (new DirectoryIterator(__DIR__ . '/filters/') as $filter) {
  if ($filter->isDir())
    continue;

  $filename = $filter->getFilename();
  if (substr($filename, -3) != '.js')
    continue;

  $scripts[] = 'filters/' . $filename;
}

foreach ($scripts as $script) {
  require __DIR__ . '/' . $script;
  echo PHP_EOL;
}

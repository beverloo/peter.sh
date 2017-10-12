<?php
if ($_GET['delay'] <= 120)
  sleep($_GET['delay']);

echo 'Delayed by ' . $_GET['delay'] . ' seconds.';

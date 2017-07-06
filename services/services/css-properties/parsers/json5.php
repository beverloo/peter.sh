<?php
// JSON5 for PHP
// [LICENSE] MIT
// [URL] https://github.com/kujirahand/JSON5-PHP
function json5_decode($json5, $assoc = false) {
  return json5_value($json5, $assoc);
}
function json5_encode($obj) {
  return json_encode($obj);
}
function json5_value(&$json5, $assoc) {
  $json5 = trim($json5);
  json5_comment($json5); // skip comment
  // check 1char
  $c = substr($json5, 0, 1);
  // Object
  if ($c == '{') {
    return json5_object($json5, $assoc);
  }
  // Array
  if ($c == '[') {
    return json5_array($json5, $assoc);
  }
  // String
  if ($c == '"' || $c == "'") {
    return json5_string($json5);
  }
  // null / true / false / Infinity
  if (strncasecmp($json5, "null", 4) == 0) {
    $json5 = substr($json5, 4);
    return null;
  }
  if (strncasecmp($json5, "true", 4) == 0) {
    $json5 = substr($json5, 4);
    return true;
  }
  if (strncasecmp($json5, "false", 5) == 0) {
    $json5 = substr($json5, 5);
    return false;
  }
  if (strncasecmp($json5, "infinity", 8) == 0) {
    $json5 = substr($json5, 8);
    return INF;
  }
  // hex
  if (preg_match('/^(0x[a-zA-Z0-9]+)/', $json5, $m)) {
    $num = $m[1];
    $json5 = substr($json5, strlen($num));
    return intval($num, 16);
  }
  // number
  if (preg_match('/^((\+|\-)?\d*\.?\d*[eE]?(\+|\-)?\d*)/', $json5, $m)) {
    $num = $m[1];
    $json5 = substr($json5, strlen($num));
    return floatval($num);
  }
  // other char ... maybe error
  $json5 = substr($json5, 1);
}
// Comment
function json5_comment(&$json5) {
  while ($json5 != '') {
    $json5 = ltrim($json5);
    $c2 = substr($json5, 0, 2);
    // block comment
    if ($c2 == '/*') {
      str_token($json5, '*/');
      continue;
    }
    // line comment
    if ($c2 == '//') {
      str_token($json5, "\n");
      continue;
    }
    break;
  }
}
// String
function json5_string(&$json5) {
  // check flag
  $flag = substr($json5, 0, 1);
  $json5 = substr($json5, 1);
  $str = "";
  while ($json5 != "") {
    // check
    $c = mb_substr($json5, 0, 1);
    $json5 = substr($json5, strlen($c));
    // Is terminator?
    if ($c == $flag) break;
    // escape
    if ($c == "\\") {
      if (substr($json5, 0, 2) == "\r\n") {
        $json5 = substr($json5, 2);
        $str .= "\r\n"; continue;
      }
      if (substr($json5, 0, 1) == "\n") {
        $json5 = substr($json5, 1);
        $str .= "\n"; continue;
      }
      if(substr($json5, 0, 1) == $flag){
        $json5 = substr($json5, 1);
        $str .= "\\".$flag;continue;
      }
    }
    $str .= $c;
  }
  $str = json_decode('"'.$str.'"'); // extract scape chars...
  return $str;
}
// Array
function json5_array(&$json5, $assoc) {
  // skip '['
  $json5 = substr($json5, 1);
  $res = array();
  while ($json5 != '') {
    json5_comment($json5);
    // Array terminator?
    if (strncmp($json5, ']', 1) == 0) {
      $json5 = substr($json5, 1);
      break;
    }
    // get value
    $res[] = json5_value($json5, $assoc);
    // skip comma
    $json5 = ltrim($json5);
    if (substr($json5, 0, 1) == ',') {
      $json5 = substr($json5, 1);
    }
  }
  return $res;
}
// Object
function json5_object(&$json5, $assoc) {
  // skip '{'
  $json5 = substr($json5, 1);
  if ($assoc) {
    $res = array();
  }
  else {
    $res = new \stdClass();
  }
  while ($json5 != '') {
    json5_comment($json5);
    // Object terminator?
    if (strncmp($json5, '}', 1) == 0) {
      $json5 = substr($json5, 1);
      break;
    }
    // get KEY
    $c = substr($json5, 0, 1);
    if ($c == '"' || $c == "'") {
      $key = json5_string($json5);
      str_token($json5, ':');
    } else {
      $key = trim(str_token($json5, ":"));
    }
    // get VALUE
    $value = json5_value($json5, $assoc);

    if ($assoc) {
      $res[$key] = $value;
    }
    else {
      $res->$key = $value;
    }

    // skip Comma
    $json5 = ltrim($json5);
    if (strncmp($json5, ',', 1) == 0) {
      $json5 = substr($json5, 1);
    }
  }
  return $res;
}
function str_token(&$str, $spl) {
  $i = strpos($str, $spl);
  if ($i === FALSE) {
    $result = $str;
    $str = "";
    return $result;
  }
  $result = substr($str, 0, $i);
  $str = substr($str, $i+strlen($spl));
  return $result;
}

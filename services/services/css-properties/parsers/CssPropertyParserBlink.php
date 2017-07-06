<?php
// Copyright 2017 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

require_once __DIR__ . '/json5.php';

// Property parser implementation for Blink. Reads all the available CSS properties from
// //src/third_party/WebKit/Source/core/css/CSSProperties.json5 in the local Chromium checkout to
// produce the array of properties.
class CssPropertyParserBlink implements CssPropertyParser {
    // Path in the Chromium source to the CSS property JSON5 file.
    const PropertyFile = '/third_party/WebKit/Source/core/css/CSSProperties.json5';

    // Parses the |self::PropertyFile| to produce an alphabetized array of the CSS properties
    // available in the Blink engine. This depends on having a local checkout available.
    public function parse() : array {
        $path = Configuration::$chromiumCheckout . self::PropertyFile;
        if (!file_exists($path) || !is_readable($path)) {
            Error('CssPropertyParserBlink: file does not exist: ' . $path);
            return false;
        }

        $configuration = json5_decode(file_get_contents($path), true /* assoc */);
        if (!is_array($configuration) || !array_key_exists('data', $configuration)) {
            Error('CssPropertyParserBlink: unable to parse the configuration.');
            return false;
        }

        $properties = [];
        foreach ($configuration['data'] as $property) {
            // TODO(peter): Should we do something with |$property['alias_for']|?
            $properties[] = $property['name'];
        }

        sort($properties);
        return $properties;
    }
}

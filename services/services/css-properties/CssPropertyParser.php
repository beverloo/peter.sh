<?php
// Copyright 2017 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Defines the interface for a CssPropertyParser implementation. Each browser
// engine will be backed by one of those as they use their own format to list
// the available CSS properties.
interface CssPropertyParser {
    // Parses the properties for this engine. The source of the properties will
    // have to be known by the parser, i.e. the URL or file path. Returns an
    // array of the alphabetized CSS property names as strings.
    public function parse() : array;
}

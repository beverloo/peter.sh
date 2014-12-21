// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

addEventListener('DOMContentLoaded', function() {
    var commits = document.querySelectorAll('ol > li');
    [].forEach.call(commits, function(commit) {
        commit.ontouchstart = function() { commit.classList.add('tapped'); };
        commit.ontouchend = function() { 
            var tapped = document.querySelectorAll('li.tapped');
            [].forEach.call(tapped, function(element) {
                element.classList.remove('tapped');
            });
        };
    });

}, false);

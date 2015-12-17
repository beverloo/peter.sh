// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

document.addEventListener('DOMContentLoaded', function() {
  // Remove the requirements banner given that JavaScript support is available.
  document.getElementById('requirements').style.display = 'none';

  var publicInfoElement = document.getElementById('public-info'),
      privateInfoElement = document.getElementById('private-info');

  publicInfoElement.addEventListener('click', function(event) {
    var content = document.getElementById('public-info-dialog').cloneNode(true /* deep */);
    DisplayDialog(content);

    event.preventDefault();  // don't override the url
  });

  privateInfoElement.addEventListener('click', function(event) {
    var content = document.getElementById('private-info-dialog').cloneNode(true /* deep */);
    DisplayDialog(content);

    event.preventDefault();  // don't override the url
  });

});

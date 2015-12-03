// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

function PushGenerator(requirementsElement) {
  NotificationGeneratorBase.call(this, requirementsElement, 'push-generator-sw.js');

  this.addRequirement(PushGenerator.REQUIREMENT_SUBSCRIPTION,
                      'Requires a valid push messaging subscription.');
}

PushGenerator.REQUIREMENT_SUBSCRIPTION = 0;

PushGenerator.prototype = Object.create(NotificationGeneratorBase.prototype);

// Copyright 2018 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

function BackgroundFetchGenerator(requirementsElement, element) {
  NotificationGeneratorBase.call(this, requirementsElement, element);
}

BackgroundFetchGenerator.prototype =
    Object.create(NotificationGeneratorBase.prototype);


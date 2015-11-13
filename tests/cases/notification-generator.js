// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

if (!Array.prototype.hasOwnProperty('includes')) {
  Array.prototype.includes = function(value) {
    for (var key in this) {
      if (this[key] == value)
        return true;
    }
    return false;
  };
}

// Returns the value of |element|.
function getElementValue(element) {
  switch (element.tagName) {
    case 'SELECT':
      var value = element.options[element.selectedIndex].value;
      if (value.indexOf(';') == 1)
        return value.substr(2);
      return value;
    case 'INPUT':
      return element.value;
  }

  return undefined;
}

function NotificationGenerator(element) {
  this.element_ = element;
  this.fields_ = {};
  this.requirements_ = [
    NotificationGenerator.REQUIREMENT_PERMISSION,
    NotificationGenerator.REQUIREMENT_SERVICE_WORKER
  ];
  this.satisfied_requirements_ = [];
  this.serialized_state_ = {};

  // Public event: OnRequirementsChanged. Called with the list of requirements
  // that have been satisfied. May be invoked multiple times.
  this.onrequirementssatisfied = function(requirements) {};
}

NotificationGenerator.REQUIREMENT_PERMISSION = 0;
NotificationGenerator.REQUIREMENT_SERVICE_WORKER = 1;

NotificationGenerator.FIELD_TYPE_STRING = 0;
NotificationGenerator.FIELD_TYPE_BOOL = 1;
NotificationGenerator.FIELD_TYPE_ARRAY = 2;
NotificationGenerator.FIELD_TYPE_BUTTONS = 3;
NotificationGenerator.FIELD_TYPE_TIME_OFFSET = 4;

NotificationGenerator.SEPARATOR_FIELD = ';;';
NotificationGenerator.SEPARATOR_VALUE = '=';

// Requests permission for notifications, and will mark the permission
// requirement as satisfied once this has been granted by the user.
NotificationGenerator.prototype.requestPermission = function() {
  var self = this;
  Notification.requestPermission(function(status) {
    if (status == 'granted')
      self.requirementSatisfied(NotificationGenerator.REQUIREMENT_PERMISSION);
  });
};

// Registers the generator's Service Worker for |scope|. The returned Promise
// will be resolved when the worker is in ACTIVE state.
NotificationGenerator.prototype.registerServiceWorker = function(scope) {
  navigator.serviceWorker.register(scope + 'notification-generator-sw.js',
                                   { scope: scope });

  var self = this;
  return navigator.serviceWorker.ready.then(function(serviceWorker) {
    self.requirementSatisfied(NotificationGenerator.REQUIREMENT_SERVICE_WORKER);
    return serviceWorker;
  });
};

// Called when a |requirement| has been satisfied.
NotificationGenerator.prototype.requirementSatisfied = function(requirement) {
  this.satisfied_requirements_.push(requirement);
  this.onrequirementssatisfied(this.satisfied_requirements_);
};

// Creates the NotificationOptions dictionary based on the options in the
// generator. Default values will be added where necessary.
NotificationGenerator.prototype.createNotificationOptions = function(state) {
  function getField(name, defaultValue) {
    if (!state.hasOwnProperty(name))
      return defaultValue;

    switch (state[name].type) {
      case NotificationGenerator.FIELD_TYPE_ARRAY:
        if (!state[name].value.length)
          return defaultValue;

        var pattern = [];
        state[name].value.split(',').forEach(function(chunk) {
          pattern.push(parseInt(chunk, 10));
        });

        return pattern;
      case NotificationGenerator.FIELD_TYPE_BUTTONS:
        if (!state[name].value.length)
          return defaultValue;

        var buttons = state[name].value.split(NotificationGenerator.SEPARATOR_FIELD),
            actions = [];

        for (var index = 0; index < buttons.length; ++index) {
          actions.push({
            action: index,
            title: buttons[index]
          });
        }

        return actions;
      case NotificationGenerator.FIELD_TYPE_TIME_OFFSET:
        if (!state[name].value.length)
          return defaultValue;

        var currentTime = Date.now(),
            givenTime = parseInt(state[name].value);

        return currentTime + givenTime;
      case NotificationGenerator.FIELD_TYPE_BOOL:
        return !!state[name].value;
      case NotificationGenerator.FIELD_TYPE_STRING:
        return state[name].value;
    }

    // This should never be reached, as the switch() handles all cases.
    return defaultValue;
  }

  // Note that the default values match those in the spec:
  // https://notifications.spec.whatwg.org/#dictdef-notificationoptions
  return {
    dir: getField('dir', 'auto'),
    // lang
    body: getField('body', ''),
    tag: getField('tag', ''),
    icon: getField('icon', ''),
    // sound
    vibrate: getField('vibrate', undefined),
    timestamp: getField('timestamp', undefined),
    renotify: getField('renotify', false),
    actions: getField('actions', undefined),
    silent: getField('silent', false),
    // noscreen
    requireInteraction: getField('requireInteraction', false),
    sticky: getField('sticky', false),

    data: {
      options: {
        action: getField('action', 'default'),
        close: getField('close', true),

        url: document.location.toString(),
      }
    }
  };
};

// Displays an alert() dialog for each of the requirements that have not been
// satisfied yet. This informs the user that the test cannot yet be executed.
NotificationGenerator.prototype.displayRequirementsAlerts = function() {
  var self = this;
  this.requirements_.forEach(function(requirement) {
    if (self.satisfied_requirements_.includes(requirement))
      return;

    switch (requirement) {
    case NotificationGenerator.REQUIREMENT_PERMISSION:
      alert('Please grant notification permission.');
      break;
    case NotificationGenerator.REQUIREMENT_SERVICE_WORKER:
      alert('Unable to install the Service Worker.');
      break;
    }
  });
};

// Displays the notification using the settings that have thus far been set.
// If not all requirements have been satisfied, the user will be alerted.
NotificationGenerator.prototype.display = function() {
  if (this.requirements_.length != this.satisfied_requirements_.length) {
    this.displayRequirementsAlerts();
    return;
  }

  var state = this.computeState(true /* include_default */);
  if (!state.hasOwnProperty('title')) {
    alert('The notification must at least have a title.');
    return;
  }

  var title = state.title.value,
      options = this.createNotificationOptions(state),
      persistent = true;

  var promise = persistent ? this.displayPersistent(title, options)
                           : this.displayNonPersistent(title, options);

  var self = this;
  return promise.then(function() {
    document.location.hash =
        self.serialize(self.computeState(false /* include_default */));
  });
};

// Displays a persistent notification on the active Service Worker registration,
// and returns a Promise that will be settled when the operation is complete.
NotificationGenerator.prototype.displayPersistent = function(title, options) {
  return navigator.serviceWorker.ready.then(function(serviceWorker) {
    return serviceWorker.showNotification(title, options);

  }).catch(function(exception) { alert(exception); });
};

// Displays a non-persistent notification using the Notification constructor,
// and returns a Promise that will be settled when the operation is complete.
NotificationGenerator.prototype.displayNonPersistent = function(title, options) {
  return new Promise(function(resolve) {
    var notification = null;
    try {
      notification = new Notification(title, options);
    } catch (exception) {
      alert(exception);
      return resolve();
    }

    notification.addEventListener('show', function() {
      resolve();
    });

    notification.addEventListener('error', function(error) {
      alert(error);
      resolve();
    });
  });
};

// Serializes |state| in a serialization that can be used in the hash part of
// the URL. The separators mentioned above will be used in this serialization.
NotificationGenerator.prototype.serialize = function(state) {
  var serialization = [];
  Object.keys(state).forEach(function(name) {
    var value = state[name].index !== undefined ? state[name].index
                                                : state[name].value;

    serialization.push(name + NotificationGenerator.SEPARATOR_VALUE + value);
  });

  return serialization.join(NotificationGenerator.SEPARATOR_FIELD);
};

// Deserializes the state from |serialization|, usually the hash from the URL.
// Values in the serialization set to the default value will be ignored.
NotificationGenerator.prototype.deserialize = function(serialization) {
  if (!serialization.startsWith('#'))
    return;

  serialization = serialization.substr(1);

  var fields = serialization.split(NotificationGenerator.SEPARATOR_FIELD),
      self = this;

  fields.forEach(function(field) {
    var valueIndex = field.indexOf(NotificationGenerator.SEPARATOR_VALUE);
    if (valueIndex == -1)
      return;

    self.serialized_state_[field.substr(0, valueIndex)] =
        field.substr(valueIndex + 1);
  });
};

// Initializes the fields for the notification generator as |fields|. It must
// be an object mapping the property name on the Notification object to an array
// of the element id that contains its value, and the type of data it contains.
NotificationGenerator.prototype.setFields = function(fields) {
  var self = this;
  Object.keys(fields).forEach(function(key) {
    var settings = fields[key];

    self.fields_[key] = {
      element: self.element_.querySelector('#' + settings[0]),
      elementCustom: self.element_.querySelector('#' + settings[0] + '_custom'),
      type: settings[1]
    };

    self.initializeField(key);
  });
};

// Initializes the field named |name|. All data will be known to the local
// class, so we need to determine the default value, and either hide or set
// the custom field depending on whether data has been deserialized.
NotificationGenerator.prototype.initializeField = function(name) {
  var field = this.fields_[name],
      self = this;

  field.defaultValue = '';
  if (field.element.tagName == 'SELECT') {
    field.defaultValue =
        field.element.options[field.element.selectedIndex].getAttribute('data-id');
  } else if (field.element.type == 'checkbox') {
    field.defaultValue = field.element.checked;
  }

  // Listen for value changes so that the custom element can be displayed or
  // hidden on demand. (If the "custom" value is present in the field.)
  field.element.addEventListener('change', function() {
    if (!field.elementCustom)
      return;

    if (getElementValue(field.element) == 'custom')
      field.elementCustom.style.display = 'initial';
    else
      field.elementCustom.style.display = 'none';
  });

  var hasCustomValue = false;

  // If a deserialized value for this field has been stored, try to select the
  // intended value in the element.
  if (this.serialized_state_.hasOwnProperty(name)) {
    var value = this.serialized_state_[name];
    switch (field.element.tagName) {
      case 'INPUT':
        if (field.element.type == 'checkbox')
          field.element.checked = value === 'true' || value === '1';
        else
          field.element.value = value;
        break;
      case 'SELECT':
        if (option = field.element.querySelector('[data-id="' + value + '"]'))
          field.element.selectedIndex = option.index;
        else if (field.elementCustom) {
          if (option = field.element.querySelector('[data-custom]'))
            field.element.selectedIndex = option.index;

          field.elementCustom.value = value;
          hasCustomValue = true;
        }
        break;
    }
  }

  // Hide the custom element by default unless a value has been deserialized.
  if (field.elementCustom && !hasCustomValue)
    field.elementCustom.style.display = 'none';
};

// Resolves the state of the field named |name|. It will check the immediate
// input field, and the custom one if that is supported.
NotificationGenerator.prototype.resolveFieldState = function(name) {
  var field = this.fields_[name],
      index = undefined,
      value = undefined;

  switch (field.element.tagName) {
    case 'INPUT':
      if (field.element.type == 'checkbox')
        value = field.element.checked;
      else
        value = field.element.value;
      break;
    case 'SELECT':
      var option = field.element.options[field.element.selectedIndex];
      if (option.hasAttribute('data-custom') && field.elementCustom) {
        value = field.elementCustom.value;
      } else {
        index = option.index;
        value = option.value;
      }
      break;
  }

  return { index: index, value: value, type: field.type };
};

// Computes the current state of the form fields. Will either include or omit
// fields with a default value depending on the value of |include_default|.
NotificationGenerator.prototype.computeState = function(include_default) {
  var self = this,
      state = {};

  // Iterate over each of the fields and resolve their value.
  Object.keys(this.fields_).forEach(function(name) {
    var defaultValue = self.fields_[name].defaultValue,
        fieldState = self.resolveFieldState(name);

    if (((fieldState.index !== undefined && fieldState.index == defaultValue) ||
         (fieldState.value == defaultValue)) && !include_default)
      return;

    // TODO: Check for the default value if |include_default|.
    state[name] = fieldState;
  });

  return state;
};

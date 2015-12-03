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

// Base for features that have one or more requirements that have to be
// satisfied before the feature itself can be used.
function RequirementsBase(requirementsElement) {
  this.requirementsElement_ = requirementsElement;

  this.requirements_ = {};
  this.satisfied_ = {};
}

RequirementsBase.prototype.addRequirement = function(id, description) {
  this.requirements_[id] = description;
  this.requirementsChanged();
};

RequirementsBase.prototype.satisfyRequirement = function(id) {
  if (!this.requirements_.hasOwnProperty(id))
    return;

  this.satisfied_[id] = this.requirements_[id];
  delete this.requirements_[id];

  this.requirementsChanged();
};

RequirementsBase.prototype.verifyRequirements = function() {
  var unsatisfiedRequirements = '';
  for (var id in this.requirements_)
    unsatisfiedRequirements += '- ' + this.requirements_[id] + '\n';

  if (!unsatisfiedRequirements.length)
    return true;

  alert(unsatisfiedRequirements);
  return false;
};

RequirementsBase.prototype.requirementsChanged = function() {
  var unsatisfiedRequirements = [];
  for (var id in this.requirements_)
    unsatisfiedRequirements.push(this.requirements_[id]);

  if (!unsatisfiedRequirements.length) {
    this.requirementsElement_.style.display = 'none';
    return;
  }

  this.requirementsElement_.style.display = 'block';

  // Remove all existing children from the requirements list.
  while (this.requirementsElement_.firstChild)
    this.requirementsElement_.removeChild(this.requirementsElement_.firstChild);

  // Add all requirements as new list items to the list.
  for (var i = 0; i < unsatisfiedRequirements.length; ++i) {
    var listItem = document.createElement('li');
    listItem.textContent = unsatisfiedRequirements[i];

    this.requirementsElement_.appendChild(listItem);
  }
};

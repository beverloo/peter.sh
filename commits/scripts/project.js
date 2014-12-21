var Project = function(id) {
  this.name_ = undefined;
  this.viewvc_ = undefined;

  Object.defineProperties(this, {
    'id': {
      value: id,
      writable: false
    },
    'name': {
      get: function() { return this.name_; },
      set: function(value) { /** not writable **/ }
    },
    'viewvc': {
      get: function() { return this.viewvc_; },
      set: function(value) { /** not writable **/ }
    }
  });
};

Project.prototype.initialize = function(name, viewvc) {
  this.name_ = name;
  this.viewvc_ = viewvc;
};

Project.prototype.toString = function() {
  return this.name;
};

// Static map for ensuring a single Project instance for a given project Id.
Project.project_map = {};

Project.fromId = function(id) {
  if (typeof (Project.project_map[id]) === 'undefined')
    Project.project_map[id] = new Project(id);

  return Project.project_map[id];
};

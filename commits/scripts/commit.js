var Commit = function(revision, project, date, author, message, flagged) {
  this.flagged_ = flagged;
  this.classes_ = [];

  Object.defineProperties(this, {
    'revision': {
      value: revision,
      writable: false
    },
    'project': {
      value: Project.fromId(project),
      writable: false
    },
    'date': {
      value: new Date(date),
      writable: false
    },
    'author': {
      value: Author.fromEmail(author),
      writable: false
    },
    'message': {
      value: message,
      writable: false
    },
    'flagged': {
      get: function() { return this.flagged_; },
      set: function(value) { this.flagged_ = value; }
    },
    'classes': {
      get: function() { return this.classes_; },
      set: function(value) { /** disallowed **/ }
    }
  });
};

Commit.prototype.addClass = function(className) {
  this.classes_.push(className);
};

Commit.prototype.toString = function() {
  return '[' + this.author + '] ' + this.message;
};

var Author = function(email, name) {
  this.name_ = undefined;
  Object.defineProperties(this, {
    'email': {
      value: email,
      writable: false
    },
    'name': {
      get: function() {
        return this.name_;
      },
      set: function(value) {
        this.name_ = value;
      }
    }
  });
};

Author.prototype.toString = function() {
  if (this.name === undefined)
    return this.email;

  return this.name + ' <' + this.email + '>';
};

// Static map for ensuring a single Author instance for a given e-mail address.
Author.author_map = {};

Author.fromEmail = function(email) {
  if (typeof (Author.author_map[email]) === 'undefined')
    Author.author_map[email] = new Author(email);

  return Author.author_map[email];
};

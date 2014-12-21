var RemoveV8TagsFilter = function() {
  this.v8_project_ = Project.fromId(3 /** v8 **/);
  if (this.v8_project_.name != 'v8')
    console.warn('Project (Id: 3) does not map to v8 anymore.');

  this.keyword_re_ = /^Tagging version/i;
};

RemoveV8TagsFilter.prototype.filter = function(commit) {
  if (commit.project != this.v8_project_)
    return false;

  return this.keyword_re_.test(commit.message);
};

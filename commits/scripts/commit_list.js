var CommitList = function() {
  this.commits_ = [];
  this.filters_ = [];
};

CommitList.prototype.add = function(commits) {
  var filterCount = this.filters_.length;
  for (var i = 0, length = commits.length; i < length; ++i) {
    var commit = commits[i],
        instance = new Commit(commit.hash, commit.project, commit.date, commit.author, commit.message, commit.flagged);

    var filtered = false;
    for (var filterIndex = 0; filterIndex < filterCount; ++filterIndex)
      filtered |= this.filters_[filterIndex].filter(instance);

    if (!filtered)
      this.commits_.push(instance);
  }
};

CommitList.prototype.addFilter = function(filter) {
  this.filters_.push(filter);
}

CommitList.prototype.reset = function() {
  this.commits_ = [];
};

CommitList.prototype.count = function() {
  return this.commits_.length;
};

CommitList.prototype.commits = function() {
  return this.commits_;
};

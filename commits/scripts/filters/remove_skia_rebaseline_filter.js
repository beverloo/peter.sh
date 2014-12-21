var RemoveSkiaRebaselineFilter = function() {
  this.skia_project_ = Project.fromId(4 /** Skia **/);
  if (this.skia_project_.name != 'Skia')
    console.warn('Project (Id: 4) does not map to Skia anymore.');

  this.keyword_re_ = /^[^\n]*re\s*baselines?[^_]/i;
};

RemoveSkiaRebaselineFilter.prototype.filter = function(commit) {
  if (commit.project != this.skia_project_)
    return false;

  return this.keyword_re_.test(commit.message);
};

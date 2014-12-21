var RemoveSkiaHousekeeperFilter = function() {
  this.skia_project_ = Project.fromId(4 /** Skia **/);
  if (this.skia_project_.name != 'Skia')
    console.warn('Project (Id: 4) does not map to Skia anymore.');

  this.skia_housekeeper_author_ = Author.fromEmail('skia.committer@gmail.com');
};

RemoveSkiaHousekeeperFilter.prototype.filter = function(commit) {
  if (commit.project != this.skia_project_)
    return false;

  return commit.author == this.skia_housekeeper_author_;
};

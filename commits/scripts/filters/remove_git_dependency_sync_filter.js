var RemoveGitDependencySyncFilter = function() { };
RemoveGitDependencySyncFilter.prototype.filter = function(commit) {
  if (commit.author.email == 'chrome-admin@google.com')
    return true;
};

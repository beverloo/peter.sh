var FlagRevertFilter = function() {
  this.keyword_re_ = /^revert/i;
};

FlagRevertFilter.prototype.filter = function(commit) {
  if (!this.keyword_re_.test(commit.message))
    return;

  // TODO: Improve these heuristics. Should we unflag reverts of reverts
  // if we can properly detect and access both?

  commit.addClass('revert');
};

var StateManager = function(flag) {
  this.flag = flag;

  // TODO(beverloo): Add support for localStorage in this class?
};

StateManager.prototype.onSelectionChanged = function(project, revision, selected) {
  if (this.flag === undefined)
    return;

  var url = '/flag.php?flag=' + this.flag + '&project=' + project + '&revision=' + revision;
  if (selected)
    url += '&selected=true';
  else
    url += '&selected=false';

  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.send();
};

var Renderer = function(templateElement) {
  this.commitTemplateElement = templateElement;
  this.containerElement = null;
  this.headerElement = null;
  this.selected = 0;

  this.onToggleCommit = function(project, revision, selected) {};
};

Renderer.linkRegularExpression = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
Renderer.crbugRegularExpression = /\s+(cr(bug|rev).com\/([0-9]+))/g;
Renderer.bugRegularExpression = /BUG=(.+?)\n/g;
Renderer.newlineRegularExpression = /\n/g;

Renderer.prototype.render = function(commitList, headerElement, containerElement) {
  this.containerElement = containerElement;
  this.headerElement = headerElement;

  // Use an inner container to minimize the amount of DOM mutations.
  var innerContainer = document.createElement('div');

  var commits = commitList.commits();
  for (var i = 0, length = commits.length; i < length; ++i) {
    if (commits[i].flagged)
      ++this.selected;

    innerContainer.appendChild(this.renderCommit(commits[i]));
  }
  
  // Invalidate the actual DOM once, by inserting the new |innerContainer| to
  // the |containerElement|. In case |containerElement| already has children,
  // remove all of them first.
  while (containerElement.children.length > 0)
    containerElement.removeChild(containerElement.children[0]);

  containerElement.appendChild(innerContainer);

  // Display the header now that we know how many commits have been selected.
  this.renderHeader(headerElement, containerElement, commitList);
};

Renderer.prototype.renderHeader = function(element, containerElement, commitList) {
  var textNode = document.createTextNode('Displaying ' + commitList.count() + ' commits.'),
      buttonNode = document.createElement('a');

  buttonNode.className = 'toggle-visibility';
  buttonNode.textContent = 'toggle selection (' + this.selected + ')';
  buttonNode.onclick = function() {
    containerElement.classList.toggle('only-selected');
  };

  element.appendChild(buttonNode);
  element.appendChild(textNode);
};

Renderer.prototype.updateHeaderText = function() {
  this.headerElement.querySelector('.toggle-visibility').textContent = 'toggle selection (' + this.selected + ')';
};

Renderer.prototype.renderCommit = function(commit) {
  var element = this.commitTemplateElement.content.cloneNode(true);
  
  // Render the individual parts of the commit template.
  this._renderCommitRevision(element.querySelector('.revision'), commit);
  this._renderCommitAuthor(element.querySelector('.author'), commit);
  this._renderCommitDate(element.querySelector('.date'), commit);
  this._renderCommitMessage(element.querySelector('.message'), commit);
  this._renderCommitCheckbox(element.querySelector('.state'), commit);

  // Apply the flagged state to the element if it's been flagged.
  if (commit.flagged)
    element.firstElementChild.classList.add('selected');
  
  // Give a minimal amount of state to the commit.
  element.firstElementChild.dataset.project = commit.project.id;
  element.firstElementChild.dataset.revision = commit.revision;

  return element;
};

Renderer.prototype._renderCommitRevision = function(element, commit) {
  var link = document.createElement('a');
  link.href = commit.project.viewvc + commit.revision;
  link.textContent = commit.revision.substr(0, 7);
  link.target = '_blank';

  element.appendChild(link);
};

Renderer.prototype._renderCommitAuthor = function(element, commit) {
  element.textContent = commit.author.email;
};

Renderer.prototype._renderCommitDate = function(element, commit) {
  var date = commit.date;

  var dateString = date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).substr(-2) +
      '-' + ('0' + date.getDate()).substr(-2);
  var timeString = ('0' + date.getHours()).substr(-2) +
      ':' + ('0' + date.getMinutes()).substr(-2) +
      ':' + ('0' + date.getSeconds()).substr(-2);

  element.textContent = dateString + ' ' + timeString;
};

Renderer.prototype._renderCommitMessage = function(element, commit) {
  var message = commit.message.replace(/</g, '&lt;');

  // Translates URLs in the commit message to be a clickable link.
  message = message.replace(Renderer.linkRegularExpression, '<a target="_blank" href="$1">$1</a>');
  message = message.replace(Renderer.crbugRegularExpression, ' <a target="_blank" href="http://$1">$1</a>');

  // Translates the BUG=1,2,3 line to clickable links in the commit's message.
  message = message.replace(Renderer.bugRegularExpression, function(match) {
    var bugs = match.substr(4, match.length - 5).split(',');

    var text = 'BUG=';
    for (var i = 0, last = bugs.length - 1; i <= last; ++i) {
      var project = 'chromium',
          bugId = bugs[i];

      // Accept syntax such as "skia:155", which is not rarely used for both Skia
      // and v8 commit messages, since they use separate issue trackers.
      if (bugs[i].indexOf(':') !== -1) {
        project = bugs[i].substr(0, bugs[i].indexOf(':'));
        bugId = bugs[i].substr(bugs[i].indexOf(':') + 1);
      }

      // Compile the link based on the |bugId| and |project| and append it to the
      // text itself. No longer show the prefix in the text.
      text += '<a target="_blank" href="https://code.google.com/p/' + project + '/issues/detail?id=' + bugId + '">' + bugId + '</a>';
      if (i != last)
        text += ', ';
    }
    
    return text + '\n';
  });

  // Replace all newlines in |message| to be HTML <br> elements.
  message = message.replace(Renderer.newlineRegularExpression, '<br />');

  element.innerHTML = message;
  element.onclick = Renderer.prototype.onToggleCommitSelection.bind(this);
};

Renderer.prototype._renderCommitCheckbox = function(element, commit) {
  var input = element.querySelector('input');
  input.onclick = Renderer.prototype.onToggleCommitSelection.bind(this);

  if (commit.flagged)
    element.querySelector('input').checked = true;
};

Renderer.prototype.onToggleCommitSelection = function(event) {
  var area = event.target.tagName == 'INPUT' ? 'checkbox' : 'message';
  if (this.containerElement.classList.contains('only-selected') && area == 'message')
    return;
  
  var commit = event.target.parentNode;
  if (area == 'checkbox')
    commit = commit.parentNode; // checkboxes are one level deeper.
 
  var selected = false;
  if (area == 'checkbox' && event.target.checked == true)
    selected = true;
  if (area == 'message' && commit.classList.contains('selected') == false)
    selected = true;

  if (selected) {
    commit.classList.add('selected');
    commit.querySelector('input[type="checkbox"]').checked = true;
    ++this.selected;
  } else {
    commit.classList.remove('selected');
    commit.querySelector('input[type="checkbox"]').checked = false;
    --this.selected;
  }

  this.onToggleCommit(commit.dataset.project, commit.dataset.revision, selected);
  this.updateHeaderText();
};

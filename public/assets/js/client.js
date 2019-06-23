(function() {

  var $ = function(sel, parent) {
    if (!parent) {
      parent = document;
    }
    return Array.prototype.slice.call(parent.querySelectorAll(sel));
  };

  function apiAction(url, success) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onload = function() {
      var json = JSON.parse(request.responseText);
      if (request.status >= 200 &&
            request.status < 400 &&
            request.responseText &&
            json.success === true
      ) {
        success(request);
      } else {
        alert(json.reason ? json.reason : request.responseText);
      }
    };
    // request.onerror = function(err) {
    //     alert('error', err);
    // };
    request.send();
  }

  function getRemote(url, success) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onload = function() {
      success(request.responseText);
    };
    // request.onerror = function(err) {
    //     alert('error', err);
    // };
    request.send();
  }

  function refreshPage() {
    window.location.hash = '#';
    window.location.reload();
  }

  function initHandlers(which) {
    var forms = $('[data-form-name="enter-name"], [data-form-name="team-signup"]');
    if (which && which.team) {
      forms = $(
        '[data-form-name="team-signup"][data-form-team-id="' + which.team + '"]'
      );
    }
    forms.map(function(form) {
      var error = false;

      form.onsubmit = function() {
        var queryStr = [];
        $('input', form).map(function(formEle) {
          if (formEle.name === 'full_name' && formEle.value.length === 0) {
            alert('Enter your name please!');
            error = true;
          } else {
            queryStr.push(formEle.name + '=' + encodeURIComponent(formEle.value));
          }
        });
        if (!error) {
          apiAction(
            form.action + '?' + queryStr.join('&'),
            function() {
              var formName = form.getAttribute('data-form-name');
              if (formName === 'team-signup') {
                refreshMembers(
                  getTeamCard(
                    form.getAttribute('data-form-team-id')
                  )
                );
              } else if (formName === 'enter-name') {
                refreshPage();
              }
            }
          );
        }
        return false;
      };
    });

    $('[data-api-action]').map(function(ele) {
      ele.onclick = function() {
        if (confirm('Are you sure?')) {
          apiAction(ele.getAttribute('href'), function() {
            if (ele.getAttribute('data-api-action') === 'team') {
              refreshAllMembers();
            } else {
              refreshPage();
            }
          });
        }
        return false;
      };
    });
  }

  function getContentForCompare(container) {
    return container.textContent + '{formValues:' + $('input', container).map(function(ele) { return ele.name + '=' + ele.value; }).join('&') + '}';
  }

  function refreshMembers(memberList) {
    var id = memberList.getAttribute('data-team-id');
    getRemote('/team?is_admin=' + window._teamSignupConfig.isAdmin + '&team_id=' + id, function(response) {
      var before = getContentForCompare(memberList);
      var div = document.createElement('div');
      div.innerHTML = response;
      var after = getContentForCompare(div);
      if (before !== after) {
        console.log('updating team', id);
        memberList.innerHTML = response;
        initHandlers({team: id});
      }
    });
  }

  function getTeamCard(id) {
    return $('[data-team-card][data-team-id="' + id + '"]')[0];
  }

  function refreshAllMembers() {
    $('[data-team-card]').map(refreshMembers);
  }

  function initApp() {
    initHandlers();
    var time = window._teamSignupConfig.refreshTeamTime;
    if (time) {
      setInterval(refreshAllMembers, time);
    }
  }

  initApp();

})();

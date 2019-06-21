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

function refresh(hash) {
    if (hash) {
        window.location.hash = '#' + hash;
    }
    window.location.reload();
}

function initHandlers() {
    $('[data-form-name="enter-name"], [data-form-name="team-signup"]').map(function(form) {
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
                        refresh()
                    }
                );
            }
            return false;
        };
    });
    
    $('[data-api-action]').map(function(ele) {
        ele.onclick = function() {
            apiAction(ele.getAttribute('href'), function() {
                refresh();
            });
            return false;
        };
    });
}

function autoRefresh() {
    setInterval(function() {
        $('[data-team-id').map(function(memberList) {
            var id = memberList.getAttribute('data-team-id');
            getRemote('/team?is_admin=' + window.config.is_admin.toString() + '&team_id=' + id, function(response) {
                memberList.innerHTML = response;
                initHandlers();
            });
        })
    }, 500);
}

initHandlers();
autoRefresh();

})();
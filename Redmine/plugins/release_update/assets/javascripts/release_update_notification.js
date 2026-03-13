(function() {
  var updates = (typeof window !== 'undefined' && Array.isArray(window.release_update)) ? window.release_update : [];
  var cnt = updates.length;
  // console.log(cnt)
  var classes = new Array();
  classes['nn_badge_bgc'] = 'nn_badge_bgc';
  classes['nn_badge_cnt'] = 'nn_badge_cnt';

  var nn_list = '<ul>';

  if (cnt > 0) {
    if (cnt > 99) {
      cnt = '!!';
    }
    classes['nn_badge_bgc'] = '';
    classes['nn_badge_cnt'] = '';

    for (var i = 0; i < updates.length; i ++) {
      nn_list += '<li><a href="/release_updates/' + updates[i][0] + '">';
      nn_list += '<div class="nn_prtl">' + updates[i][1] + '</div>';
      nn_list += '<div class="summary">' + updates[i][2] + '</div>';
      nn_list += '<div class="nn_info">' + get_release_date(updates[i][3]) + '</div>';
      nn_list += '</a></li>';
    }
  } else {
    nn_list += '<li><a class="nn_none">No unread release.</a></li>';
  }
  nn_list += '</ul>';

  var nn = document.querySelector('.nn');
  if (!nn) { return; }
  nn.innerHTML = '<span id="nn_badge"><span id="nn_badge_bgc" class="' + classes['nn_badge_bgc'] + '"></span><span id="nn_badge_cnt" class="' + classes['nn_badge_cnt'] + '">' +  cnt + '</span></span>';
  nn.insertAdjacentHTML('afterend', '<div id="nn_list_box" class="hide"><div id="nn_header"><a href="/release_updates">View all releases</a></div><div id="nn_list">' + nn_list + '</div></div>');

  var nn_list_box = document.getElementById('nn_list_box');

  nn.addEventListener('click', function(e) {
    e.preventDefault();
    if (window.jQuery) {
      jQuery(nn_list_box).toggleClass('hide');
    } else {
      nn_list_box.classList.toggle('hide');
    }
    // if()

    // console.log($(nn_list_box))
    // console.log($(nn_list_box).hasClass('show'))
    // if (nn_list_box.style.visibility === 'hidden') {
    //   nn_list_box.style.visibility = 'visible';
    //   document.addEventListener('click', nn_hidden, false);
    // } else {
    //   nn_hidden(e, true);
    // }
  }, false);

  if (window.jQuery) {
    jQuery('body').on('click', function(e){
      if (e.target && jQuery(e.target).attr('id') != 'nn_badge_cnt'){
        if (!jQuery(nn_list_box).hasClass('hide')) {
          jQuery(nn_list_box).addClass('hide');
        }
      }
    });
  } else {
    document.body.addEventListener('click', function(e){
      var target = e.target;
      if (target && target.id !== 'nn_badge_cnt'){
        if (!nn_list_box.classList.contains('hide')) {
          nn_list_box.classList.add('hide');
        }
      }
    });
  }

  function get_release_date(date){
    date = new Date(date)
    var day = date.getDate();
    var month = date.getMonth() + 1;
    var year = date.getFullYear().toString();
    // console.log(year + '-' + month + '-' + day;)
    return year + '/' + month + '/' + day;
  }

  function nn_hidden(e, flag) {
    if (is_nn(e.target) && flag !== true) {
      return false;
    }
    // nn_list_box.style.visibility = 'hidden';
    // document.removeEventListener('click', nn_hidden);
  }

  function is_nn(elm) {
    while (elm = elm.parentNode) {
      if (elm.id === 'nn_list_box' || elm.id === 'nn_badge') {
        return true;
      }
    }
    return false;
  }
})();
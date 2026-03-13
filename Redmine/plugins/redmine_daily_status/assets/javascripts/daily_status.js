function dateDiff(first, second) {

    // Copy date parts of the timestamps, discarding the time parts.
    var one = new Date(first.getFullYear(), first.getMonth(), first.getDate());
    var two = new Date(second.getFullYear(), second.getMonth(), second.getDate());

    // Do the math.
    var millisecondsPerDay = 1000 * 60 * 60 * 24;
    var millisBetween = two.getTime() - one.getTime();
    var days = millisBetween / millisecondsPerDay;

    // Round down.
    return Math.floor(days)
}

function getQueryStrings() {
    var q = window.location.search.substr(1), qs = {};
    if (q.length) {
        var keys = q.split("&"), k, kv, key, val, v;
        for (k = keys.length; k--; ) {
            kv = keys[k].split("=");
            key = kv[0];
            val = decodeURIComponent(kv[1]);
            if (qs[key] === undefined) {
                qs[key] = val;
            } else {
                v = qs[key];
                if (v.constructor != Array) {
                    qs[key] = [];
                    qs[key].push(v);
                }
                qs[key].push(val);
            }
        }
    }
    return qs;
}

function getNewCalandarDate(date,days_ago)
{
    var selecteddate = new Date(
        date.getFullYear(), 
        date.getMonth(), 
        date.getDate() - days_ago,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
    )
    return selecteddate;  
}

function add_Class_To_Selected_Date()
{
  $('.ui-datepicker-calendar tr td a.ui-state-default.ui-state-highlight').removeClass('ui-state-highlight');
  $('.ui-datepicker-calendar tr td a.ui-state-default.ui-state-active').addClass('ui-state-highlight').removeClass('ui-state-active');
}

$('.ui-dialog').on("dialogclose", function(){
  setTimeout(function(){ showHideText(); },300); 
});
$('.delete').on('click' , function() {
  setTimeout(function(){ showHideText(); },300);  
});

function showHideText() {
  if(parseInt($('#watchers > ul').length) > 0)
  {
    $('.daily_status_email_note').hide();
    $('#project_members').hide();
    $('#project_watchers').show();
    
  }else if(parseInt($('#watchers > ul').length) <= 0)
  {
    $('.daily_status_email_note').show();
    $('#project_members').show();
    $('#project_watchers').hide();    
  }
}

$(function() {
  $('#accordion').accordion({
    collapsible: true,
    active : false
  });
});

$(document).ready(function() {
  $('.reply-head').on('click', function() {
    var reply_id = $(this).attr('id');
    $.ajax({
      url: '/read',
      dataType: 'script',
      data: { reply_id: reply_id.split('_')[1] },
      method: 'POST',
      success:function(){
      }
    });
  });
});

function makeWatchers(project_id, user_id, daily_status_id){
  $.ajax({
    url: '/projects/'+project_id+'/daily_status_watchers',
    dataType: 'script',
    data: { user_id: user_id, daily_status_id: daily_status_id },
    method: 'POST',
    success:function(){
    }
  });
}

$(document).ready(function() {
  $('#select_all').on('change' , function() {
    set_checkboxes();
  });
  $('#content').find('form').submit(function(){
    var value = $('.sign1-field').val();
    $('.signature-field').val(value);
  });
});

function set_checkboxes(){
  if($('#select_all').prop('checked') == true){
    $('.users').prop('checked', true);
  }
  else{
    $('.users').prop('checked', false);
  }
}

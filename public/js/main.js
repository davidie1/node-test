$(document).ready(() => {
  $('[data-toggle="tooltip"]').tooltip();

  function getQueryParameters () {
    return location.search.replace(/(^\?)/,'')
    .split("&").map(function(n){return n = n.split("="),this[n[0]] = n[1],this}.bind({}))[0];
  }

  /**
   * Filter clients table
   */
  $("#clientsSearch").on("keyup", function() {
    var value = $(this).val().toLowerCase();
    $("#clientsTable tbody tr").filter(function() {

      // Smart search
      var rowText = $(this).text().toLowerCase();
      var searchWords = value.split(' ');
      $(this).toggle(searchWords.every(sw => rowText.indexOf(sw) > -1));
    });
  });

  /**
   * Lessons calendar
   */
  $('h5 a.badge').each(function () {
    const query = getQueryParameters();
    var offset = $(this).data('offset');
    query.offset = offset;
    
    var path = window.location.pathname + '?' + $.param(query);
    $(this).attr('href', path);
  })

  function callNewLesson (e) {
    var day = $(this).index() - 1;
    var hour = $(this).closest('tr').text();
    const cellBorder = parseInt($(this).css('border'))
    const eventOffset = (e.pageY - ($(this).offset().top - cellBorder)) - cellBorder;
    const cellHeight = $(this).height() +  parseInt($(this).css('paddingTop')) * 2;
    var cellOffset = eventOffset / cellHeight

    if (eventOffset > cellHeight) {
      hour = $(this).closest('tr').is(':last-child') ? $('#tableParent tbody td:first').closest('tr').text() 
      : $(this).closest('tr').next().text();
      day = (day + 1) % 7 
      cellOffset = 0;
    } else if (eventOffset < 0) {
      cellOffset = 0
    }
    const minutesOffset = Math.floor(60 * cellOffset);
    const newLessonTime = hour.replace(/..$/, ('0' + minutesOffset).slice(-2));

    const urlDateOffset = getQueryParameters().offset;
    const query = $.param({
      offset: urlDateOffset,
      date: [day, newLessonTime].join('-')
    });
    location.href = `/add-lesson?${query}`;
  }

  $('#tableParent tbody td').on({
    dblclick: callNewLesson,
    touch: callNewLesson
  });

  function getColRow (date) {
    const day = date.getDay();
    const hour = date.getHours();
    var dayIndex;
    var hourIndex;

    if (hour < 7) {
      dayIndex = day ? day - 1 : 6;
      hourIndex = hour + 17; 
    } else {
      dayIndex = day;
      hourIndex = hour - 7;
    }
    return [dayIndex, hourIndex]
  }

  function getEventOffseet (date, duration) {
    var topOffset = date.getMinutes() / 60;
    var dur = duration / 60;
    return [topOffset, dur];
  }
  
  $('.custom-absolute').each(function () {
    const colorsClasses = ['badge-secondary', 'badge-primary',
      'badge-success', 'badge-danger', 'badge-warning', 'badge-info', 'badge-dark']
    const table = $('#lessons-table')
    const divTop = $('#tableParent').offset().top
    const divLeft = $('#tableParent').offset().left

    const isMobile = window.matchMedia("only screen and (max-width: 760px)");

    const start = $(this).data('start');
    const duration = parseInt($(this).data('duration'));
    
    const date = new Date(start);
    const [colIndex, rowIndex] = getColRow(date);
    const [topOffset, dur] = getEventOffseet(date, duration);

    const cell = $(table[0].rows[rowIndex + 1].cells[colIndex + 1]);
    
    const cellLeft = cell.offset().left;
    const cellTop = cell.offset().top;
    const relativeTop = cellTop - divTop;
    const relativeLeft = cellLeft - divLeft;
    const cellWidth = cell.width();
    const cellHeight = cell.height();
    const padding = parseInt(cell.css('paddingTop'));
    const border = parseInt(cell.css('borderTop'));
    const adding = padding * 2;
    const cellWidthSize = cellWidth + adding;
    const cellHeightSize = cellHeight + adding
    var leftAdd = 0;
    var widthAdd = 0;

    if (!isMobile.matches) {
      leftAdd = 1 + (2 * (colIndex + 1));
      widthAdd = 2;
      if (colIndex > 3) {
        leftAdd += 2;
        widthAdd++;
      } else if (colIndex > 0) {
        leftAdd++;
        widthAdd++;
      }
    }

    $(this).css({
      top: relativeTop + (topOffset * cellHeightSize),
      left: relativeLeft - leftAdd,  
      width: cellWidthSize + border * 2 + widthAdd,
      height: dur * cellHeightSize + border * 2
    })

    const colorClass = colorsClasses[Math.floor(Math.random() * colorsClasses.length)];
    $(this).addClass(colorClass);
  })

  $(".add-new").click(function () {
    add = true;    
    $(this).attr('disabled', 'disabled');
    closeEdit();

    var actions = $("#paymentsTable td:last-child").html();
    var index = $('#paymentsTable tbody tr:last-child').index();
    var row = '<tr><td><input type="date" class="form-control" name="date" id="date" required value="' +
      new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().substring(0, 10) +
      '"></td><td><input type="number" class="form-control" name="amount" id="amount" value="100"></td>' +
      '<td class="text-right"><input type="radio" name="method" value="cash" id="cash" checked><span>מזומן</span>' +
      '<input type="radio" class="mr-2" name="method" value="check" id="check"><span>צ`ק</span></td>' +
      '<td class="text-center">' + actions + '</td>' +
    '</tr>';
    $('#paymentsTable').append(row);
    $('#paymentsTable tbody tr').eq(index + 1).find('.add, .edit, .delete').toggle();
    $('[data-toggle="tooltip"]').tooltip();
  });

  /**
   * Client payments table
   */
  var close = false;
  var add;

  function closeEdit() {
    $('.edit').each(function () {
      $(this).addClass('is-disabled');
    })
    close = true;
  }

  function openEdit() {
    $('.edit').each(function () {
      $(this).removeClass('is-disabled');
    })
    close = false;
  }

  $(document).on('click', '.edit', function () {
    add = false;
    if (!close) {
      closeEdit();
      $(this).parents('tr').find('td:not(:last-child)').each(function (index) {
        switch (index) {
          case 0:
            $(this).html('<input type="date" class="form-control" name="date" id="date" required value="'  + $(this).text().split('-').reverse().join('-') + '">');
            break;
          case 1:
            $(this).html('<input type="number" class="form-control" name="amount" id="amount" value="' + $(this).text() +  '">');
            break;
          case 2:
            var cash = $(this).text() === 'מזומן' ? 'checked' : '';
            var check = $(this).text() !== 'מזומן' ? 'checked' : '';
            $(this).html('<input type="radio" name="method" value="cash" id="cash"' +  cash
            +'><span>מזומן</span><input type="radio" class="mr-2" name="method" value="check" id="check"' + check
            + '><span>צ`ק</span>');
            break;
        }
      })
      $(this).parents('tr').find('.add, .edit').toggle();
      $(".add-new").attr("disabled", "disabled");
    }
  });

  $(document).on('click', '.add', function () {
    var empty = false;
		var input = $(this).parents("tr").find('input');
        input.each(function(){
        if(!$(this).val()){
          $(this).addClass("error");
          empty = true;
        } else {
          $(this).removeClass("error");
        }
		});
    $(this).parents("tr").find(".error").first().focus();

		if(!empty){
      const form = $(this).closest('form');
      if (add) {
        form.attr('action', window.location.pathname + '/add-payment');
      } else {
        var id = $(this).parents("tr").attr('id');
        form.attr('action', window.location.pathname + '/payments/' + id);
      }
      form.submit();
		}		
  })

  $(document).on('click', '.delete', function () {
    $('[data-toggle="tooltip"]').tooltip('hide');
    $(this).parents('tr').remove();
    $(".add-new").removeAttr("disabled");
    openEdit();
  });
});

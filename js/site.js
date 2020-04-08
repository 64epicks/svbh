
var app = new Vue({
    el: '#app',
    data : {
    },

    mounted: function () {
        setTimeout(function()
        {
            document.title = pagename + ' | Svensk backhoppning';
            $("#app").css("visibility", "visible").hide().fadeIn(800);
            $("#load_symbol").fadeOut(600);
        }, 500);
    }
});

(function($) { 
    $(function() { 
      $('nav ul li a:not(:only-child)').click(function(e) {
        $(this).siblings('.navbar-dropdown').toggle();
        $('.dropdown').not($(this).siblings()).hide();
        e.stopPropagation();
      });
      $('html').click(function() {
        $('.navbar-dropdown').hide();
      });
      $('#navbar-toggle').click(function() {
        $('nav ul').slideToggle();
      });
      $('#navbar-toggle').on('click', function() {
        this.classList.toggle('active');
      });
    }); 
  })(jQuery);

(function( $ ) {
  $(document).ready(function() {

    /*
     * WATCH/HANDLE:
     * - Adjust window padding when footer changes size
     */
    $('footer').eye({
      load: true,
      'height()': function () {
        var footer = $('footer').outerHeight();
        $('html').css('padding-bottom', footer);
      }
    }, 100);

  });
}( jQuery ));

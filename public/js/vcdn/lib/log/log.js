var vcdn = (function(v) {
  v.Log = {

    /**
     * Used as a replacement for standard console.log functionality.
     * @param moduleName
     */
    trace: function( /*, *args */ ) {
      if (v.Global.debug) {
        var args = arguments;
        console.log.apply(console, args);
      }
    }
  };

  return v;
}(vcdn || {}));
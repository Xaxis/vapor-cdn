var vcdn = (function(v) {
  v.Util = {};

  /**
   * Returns a timestamp that can be modified by an offset number of MS.
   *
   * @param offset {Number} The number of MS to offset the JS date function by.
   * @returns {Number}
   */
  v.Util.timestamp = function( offset ) {
      return offset ? Date.now() + offset : Date.now();
  };

  /**
   * Returns an array of keys that exist in a collection.
   *
   * @param col {Object} An object literal
   * @returns {Array}
   */
  v.Util.keys = function( col ) {
    var ret = [];
    for (var key in col) {
      if (col.hasOwnProperty(key)) {
        ret.push(key);
      }
    }
    return ret;
  };

  /**
   * Returns the first item in a collection.
   *
   * @param col {Object} An object literal
   * @returns {Object}
   */
  v.Util.first = function( col ) {
    var ret = null;
    for (var key in col) {
      ret = col[key];
      break;
    }
    return ret;
  };

  /**
   * Iterates over a collection.
   *
   * @param col {Object|Array} The collection to iterate over
   * @oaran callback {Function} The callback to fire for each iteration
   */
  v.Util.each = v.Util.forEach = function( col, callback ) {
    if (col == null) return;
    if (col.forEach) {
      col.forEach(callback);
    } else if (col instanceof Array) {
      for (var i = 0; i < col.length; i++) {
        if (callback.call(col[i], col[i], i, col) === false) return;
      }
    } else {
      for (var key in col) {
        if (col.hasOwnProperty(key)) {
          if (callback.call(col[key], col[key], key, col) === false) return;
        }
      }
    }
  };

  /**
   * Method extends properties of objects onto the first passed target object.
   *
   * @param obj {...Object} Two or more object literals
   * @returns {Object}
   */
  v.Util.merge = v.Util.extend = function( obj ) {
    var objs = v.Util.toArray(arguments);
    var target = objs.shift();
    objs.forEach(function(source) {
      for (var key in source) {
        if (source.hasOwnProperty(key)) {
          target[key] = source[key];
        }
      }
    });
    return target;
  };

  /**
   * Converts a collection to an array.
   *
   * @param col {Object} The object to convert
   * @returns {Array}
   */
  v.Util.toArray = function( col ) {
    var ret = [];
    for (var key in col) {
      if (col.hasOwnProperty(key)) {
        ret.push(col[key]);
      }
    }
    return ret;
  };

  /**
   * Compares two arrays testing for equality of total values (NOT the order of those values).
   *
   * @param arr1 {Array} The first array to compare
   * @param arr2 {Array} The second array to compare
   * @returns {Boolean}
   */
  v.Util.arrayValuesEqual = function( arr1, arr2 ) {
    for (var i = 0; i < arr2.length; i++) {
      var value = arr2[i];
      if (arr1.indexOf(value) == -1) return false;
    }
    return true;
  };

  /**
   * Returns an array containing the values that exist in both arrays.
   *
   * @param arr1 {Array} The first array to compare
   * @param arr2 {Array} The second array to compare
   * @returns {Array}
   */
  v.Util.getArrayValuesEqual = function( arr1, arr2 ) {
    var ret = [];
    for (var i = 0; i < arr2.length; i++) {
      var value = arr2[i];
      if (arr1.indexOf(value) != -1) ret.push(value);
    }
    return ret;
  };

  /**
   * Return an array with duplicates removed.
   *
   * @param arr {Array} The array to remove duplicates from
   * @returns {Array}
   */
  v.Util.arrayRemoveDuplicates = function( arr ) {
    var ret = [];
    for (var i = 0; i < arr.length; i++) {
      var value = arr[i];
      if (ret.indexOf(value) == -1) ret.push(value);
    }
    return ret;
  };

  /**
   * Returns an array of two arrays' values that differ.
   *
   * @param arr1 The first array to compare
   * @param arr2 The second array to compare
   * @returns {Array}
   */
  v.Util.diffArray = function( arr1, arr2 ) {
    var ret = [],
        arrs = [arr1, arr2];
    arrs.forEach(function(arr, key) {
      arr.forEach(function(val, idx) {
        if (key == 0) {
          if (arrs[1].indexOf(val) == -1) ret.push(arrs[0][idx]);
        } else {
          if (arrs[0].indexOf(val) == -1) ret.push(arrs[1][idx]);
        }
      });
    });
    return ret;
  };

  /**
   * Converts an array buffer to a string.
   *
   * @param buffer An array buffer
   * @returns {String}
   */
  v.Util.ab2str = function( buffer ) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
  };

  /**
   * Converts a string to an array buffer.
   *
   * @param string {String} A string
   * @returns {ArrayBuffer}
   */
  v.Util.str2ab = function( string ) {
    var buffer = new ArrayBuffer(string.length);
    var bufferView = new Uint8Array(buffer);
    for (var i = 0, strLen = string.length; i < strLen; i++) {
      bufferView[i] = string.charCodeAt(i);
    }
    return buffer;
  };

  /**
   * Perform an AJAX GET request for an asset's resource.
   *
   * @param options {Object} Parameters
   * @param options.uri {String} Target URI of request
   * @param options.elm {Element} Element request is in reference to
   * @param options.responseType {String}
   * @param options.success {Function} A callback fired on success
   */
  v.Util.get = function( options ) {
    var req = new XMLHttpRequest();
    req.open('GET', options.uri, true);
    req.responseType = options.responseType || 'text';
    req.onreadystatechange = function(r) {
      if (req.readyState == 4 && req.status == 200) {
       options.success.apply(this, [r.target.response, options.elm, r, options]);
      }
    };
    req.send();
  };

  /**
   * Pads a string with 'count' number of 'char' characters.
   *
   * @param str {String} String to pad
   * @param char {String} Character to use as padding
   * @param count {Number} Maximum length of the returned string
   * @returns {*}
   */
  v.Util.padString = function( str, char, count ) {
    return str + Array(Math.abs(str.length-(count+1))).join(char);
  };

  return v;
}(vcdn || {}));
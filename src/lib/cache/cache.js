(function(v) {
  v.Cache = {

    /**
     * Returns the storage method based on the global 'storage_mode' configuration.
     */
    localStorage: function() {
      switch (v.Global.storage_mode) {
        case 'session' :
          return window.sessionStorage;
        case 'local' :
          return window.localStorage;
      }
    }(),

    /**
     * Adds a value to the localStorage object.
     *
     * @param key {String} Property reference of the stored object
     * @param stowObj {Object} Object to store
     */
    addLocalStorage: function ( key, stowObj ) {
      var
        data  = JSON.stringify(stowObj),
        key   = v.Global.cache_prefix + key;
      this.localStorage.setItem(key, data);
    },

    /**
     * Returns local storage object at Global.cache_prefix namespace. Passing 'noPrefix' returns the localStorage object
     * referenced without using the Global.cache_prefix.
     *
     * @param key {String} A reference key
     * @param noPrefix {Boolean} Flag indicating to use unprefixed key
     * @returns {*}
     */
    getLocalStorage: function ( key, noPrefix ) {
      key = noPrefix ? key : v.Global.cache_prefix + key;
      return JSON.parse(this.localStorage.getItem(key));
    },

    /**
     * Returns an array of all localStorage objects within the Global.cache_prefix namespace. When 'ns' is passed
     * returns all objects within that namespace.
     *
     * @param ns {String} Namespace key
     * @returns {Array}
     */
    getAllLocalStorage: function ( ns ) {
      var ret = [],
          keys = v.Cache.getLocalStorageKeys();
      keys.forEach(function(key) {
        var reg = ns ? v.Global.cache_prefix + ns : v.Global.cache_prefix;
        var test = new RegExp('^' + reg, 'g');
        if (test.test(key)) {
          ret.push(v.Cache.getLocalStorage(key, true));
        }
      });
      return ret;
    },

    /**
     * Returns an array of all localStorage keys within the vapor domain.
     *
     * @returns {Array}
     */
    getLocalStorageKeys: function () {
      return v.Util.keys(this.localStorage);
    },

    /**
     * Removes a localStorage object.
     *
     * @param key {String} A reference key
     */
    deleteLocalStorage: function ( key ) {
      this.localStorage.removeItem(key);
    },

    /**
     * Removes all local storage objects prefixed with Global.cache_prefix. When 'ns' is passed deletes all objects
     * within that namespace.
     *
     * @param ns {String} A namespace string
     */
    deleteAllLocalStorage: function ( ns ) {
      var reg = ns ? v.Global.cache_prefix + ns : v.Global.cache_prefix;
      var cache_keys = v.Cache.getLocalStorageKeys();
      cache_keys.forEach(function(key) {
        var test = new RegExp(reg, 'g');
        if (test.test(key)) {
          v.Cache.deleteLocalStorage(key);
        }
      });
    },

    /**
     * Returns truthy when a local storage object at key exists.
     *
     * @param key {String} Reference key
     * @returns {Boolean}
     */
    doesStorageObjectExist: function ( key ) {
      return v.Cache.getLocalStorage(key) ? true : false;
    },

    /**
     * A check determining if any file assets exist in local storage.
     *
     * @returns {Boolean}
     */
    doFileAssetsExist: function() {
      var files = v.Cache.getAllLocalStorage('file');
      return files.length ? true : false;
    },

    /**
     * Method returns an array of all elements that contain the 'data-vcdn' attribute.
     *
     * @param selector {String} A CSS selector
     * @returns {Array}
     */
    getCacheableAssets: function( selector ) {
      selector = selector || '[data-vcdn]';
      var ret = [];
      var ctx = document.querySelector('html');
      var assets = v.Util.toArray(ctx.querySelectorAll(selector));
      assets.forEach(function(elm, idx) {
        if (typeof elm != 'number') {
          if (elm.getAttribute('data-vcdn') !== "") {
            ret.push(elm);
          }
        }
      });
      return ret;
    },

    /**
     * Method iterates over each element in the page with a data-vcdn attribute.
     *
     * @param callback {Function}
     */
    forEachCacheableAsset: function( callback ) {
      var elms = v.Cache.getCacheableAssets();
      elms.forEach(function(elm, index) {
        var src = v.Cache.getAssetUri(elm);
        callback.apply(this, [elm, src, index]);
      });
    },

    /**
     * Returns an array of all cacheable asset URIs (those that CAN or ARE cached already).
     *
     * @returns {Array}
     */
    getCacheableAssetList: function() {
      var ret = [];
      v.Cache.forEachCacheableAsset(function(elm, src) {
        ret.push(src);
      });
      return ret;
    },

    /**
     * Returns an array of all cached asset URIs.
     *
     * @returns {Array}
     */
    getCachedAssetList: function() {
      var ret = [];
      v.Cache.forEachCachedAsset(function(obj) {
        ret.push(obj.name);
      });
      return ret;
    },

    /**
     * Returns the type of URI attribute (typically 'src' or 'href').
     *
     * @param elm
     * @returns {String}
     */
    getAssetUriAttribute: function( elm ) {
      var t = elm.nodeName.toLowerCase(),
          ret = '';
      switch (true) {
        case t == 'link' :
          ret = 'href';
          break;
        case t == 'img' || t == 'script' :
          ret = 'src';
          break;
      }
      return ret;
    },

    /**
     * Returns the XHR responseType that should be set upon XHR request.
     *
     * @param elm {Element} An asset element reference
     * @returns {String}
     */
    getAssetResponseType: function( elm ) {
      var t = elm.nodeName.toLowerCase(),
        ret = '';
      switch (true) {
        case t == 'link' :
          ret = 'text';
          break;
        case t == 'script' :
          ret = 'text';
        case t == 'img' :
          ret = 'arraybuffer';
          break;
      }
      return ret;
    },

    /**
     * Loads an asset into the DOM from its file object.
     *
     * @param asset_elms {Array} Array of elements
     * @param data {*} Data returned from server
     * @returns {Blob}
     */
    loadAssetToDom: function( asset_elms, data ) {

      // Create data blob and object url
      var blob = new Blob([data]);
      var asset_uri = URL.createObjectURL(blob);

      // Iterate over all asset elements
      asset_elms.forEach(function(elm) {

        // Set the element's "src" attribute with the object url
        elm.setAttribute(v.Cache.getAssetUriAttribute(elm), asset_uri);

        // Remove any duplicate flags set in 'getAssetFromServer'
        elm.removeAttribute('data-vcdn-duplicate');
      });

      // Clear data from memory
      URL.revokeObjectURL(asset_uri);
      return blob;
    },

    /**
     * Loads a VCDN element's asset from remote server.
     *
     * @param elm {Element} The element with the asset source to retrieve
     * @param callback {Function} A callback to fire on successful return of data from the server
     */
    getAssetFromServer: function( elm, callback ) {
      var uri = elm.getAttribute('data-vcdn');

      // Handle loading of duplicate assets (elements with the same resource)
      var asset_elms = v.Cache.getCacheableAssets('[data-vcdn="' + uri + '"]');
      var asset_elms_count = asset_elms.length;
      if (asset_elms_count > 1 && !elm.getAttribute('data-vcdn-duplicate')) {
        asset_elms[0].setAttribute('data-vcdn-duplicate', 'true');
      }

      // Only proceed when element isn't a duplicate resource already downloading.
      if (!elm.getAttribute(v.Cache.getAssetUriAttribute(elm)) && (elm.getAttribute('data-vcdn-duplicate') || (asset_elms_count == 1 && !elm.getAttribute('data-vcdn-duplicate')))) {
        v.Util.get({
          uri: uri,
          elm: elm,
          responseType: v.Cache.getAssetResponseType(elm),
          success: function(data, elm, xhr, config) {

            // Load asset element resource into DOM
            var blob = v.Cache.loadAssetToDom(asset_elms, data);

            // Cache asset in v.Global.storage and/or cache storage
            v.Cache.cacheAsset({
              elm: elm,
              blob: blob,
              data: typeof data == 'string' ? data : null,
              cache: typeof data == 'string'
            });

            // Call onReady callback
            callback.apply(this, [elm, uri]);
          }
        });
      }
    },

    /**
     * Loads ALL VCDN elements' assets from remote server(s).
     *
     * @param options {Object} Parameters
     * @param options.list {Array} A white list of asset URIs that restricts asset retrieval
     * @param options.onReady {Function} Callback to fire after assets have loaded
     */
    getAllAssetsFromServer: function( options ) {
      var
        list        = options.list || [],
        onReady     = options.onReady;
      v.Cache.forEachCacheableAsset(function(elm) {
        var uri = v.Cache.getAssetUri(elm);
        var asset = v.Cache.getFileAssetByName(uri);
        if (!asset && list.indexOf(uri) != -1) {
          v.Cache.getAssetFromServer(elm, onReady);
        }
      });
    },

    /**
     * Caches an element's asset in v.Global.storage and local cache when applicable.
     *
     * @param options {Object} Parameters
     * @param options.elm {Element} Asset element reference
     * @param options.blob {Blob} Asset data as a Blob
     * @param options.data {String} Asset data when it is of type string
     * @param options.cache {Boolean} Flag indicating data can be cached in localStorage
     */
    cacheAsset: function( options ) {
      var
        key     = 'file.' + v.Cache.getAssetUri(options.elm),
        s_key   = v.Global.cache_prefix + key;

      // Chunkify asset
      var chunks = v.Cache.chunkifyAsset({
        asset: {
          data: options.blob,
          size: options.blob.size
        },
        chunk_size: v.Global.chunk_size
      });

      // Store data in v.Global.storage object
      v.Global.storage[s_key] = {
        id: s_key,
        chunks: chunks
      };

      // Store only NON-binary data in local storage
      if (options.cache && !v.Cache.getLocalStorage(key, true)) {
        v.Cache.addLocalStorage(key, {
          id: v.Global.cache_prefix + key,
          name: v.Cache.getAssetUri(options.elm),
          data: options.data
        });
      }
    },

    /**
     * Splits a file asset into chunks and returns them in an array.
     *
     * @param options {Object} Parameters
     * @param options.asset {Object} Contains asset object
     * @param options.asset.data {Blob} The asset data
     * @param options.asset.size {Number} The size in bytes of the asset
     * @param options.chunk_size {Number} Size in bytes to split asset into
     * @param options.callback {Function} A function that can be run on each chunk
     * @returns {Array}
     */
    chunkifyAsset: function( options ) {
      var
        file_data     = options.asset.data,
        file_size     = options.asset.size - 1,
        chunk_size    = options.chunk_size,
        chunk_count   = Math.ceil(file_size / options.chunk_size),
        chunk_index   = 0,
        ret           = [];

      // Split asset into chunks
      for (chunk_index; chunk_index < chunk_count; chunk_index++) {
        var start = (chunk_index * chunk_size);
        var end = start + chunk_size;
        var slice = file_data.slice(start, end);
        var chunk = options.callback ? options.callback(slice) : slice;
        ret.push(chunk);
      }
      return ret;
    },

    /**
     * Retrieves an asset from local cache by element URL which maps to 'name' property.
     *
     * @param url {String} An element asset's data-vcdn attribute value
     */
    getFileAssetByName: function( url ) {
      var ret = null;
      var assets = v.Cache.getAllLocalStorage('file');
      assets.forEach(function(obj) {
        if (obj.name == url) {
          ret = obj;
          return true;
        }
      });
      return ret;
    },

    /**
     * Returns an elements asset source.
     *
     * @param elm {Element} An element reference
     * @returns {String|*|string}
     */
    getAssetUri: function( elm ) {
      return elm.getAttribute('data-vcdn');
    },

    /**
     * Iterates over each locally cached local storage object in the 'file' namespace.
     *
     * @param callback {Function} A callback to fire on each locally cached object
     */
    forEachCachedAsset: function( callback ) {
      var cached = v.Cache.getAllLocalStorage('file');
      cached.forEach(function(obj, idx) {
        callback.apply(this, [obj, idx]);
      });
    },

    /**
     * Removes elements from cache that are no longer marked as VCDN assets.
     */
    uncacheDeadAssets: function() {
      v.Cache.forEachCachedAsset(function(obj) {
        var elm = v.Cache.getCacheableAssets(['[data-vcdn="'+ obj.name +'"]']);
        if (!elm.length) {
          v.Cache.deleteLocalStorage(obj.id);
        }
      });
    },

    /**
     * Loads all cached assets from local cache (localStorage/sessionStorage)
     */
    loadAllCachedAssets: function() {
      v.Cache.forEachCachedAsset(function(obj) {

        // Load cached asset into the DOM
        var elms = v.Cache.getCacheableAssets('[data-vcdn="' + obj.name + '"]');
        var blob = v.Cache.loadAssetToDom(elms, obj.data);

        // Cache asset in v.Global.storage and cache storage
        v.Cache.cacheAsset({
          elm: elms[0],
          blob: blob,
          data: obj.data,
          cache: true
        });
      });
    }

  };

  return v;
}(vcdn || {}));
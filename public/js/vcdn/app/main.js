var vcdn = (function(v) {

  // @TODO - Develop functionality for sharing large media assets (video streams, etc.)

  // @TODO - Develop testing "framework"

  // @TODO - Finish asset watcher fail backs

  // @TODO - Develop functionality to cache text based assets in local storage

  // @TODO - When asset is interrupted (when handleBrokenRequests is called), host fails to register
  // as a ready host even after retrieving assets from an alternate source. Fix.


  // Form socket connection with server
  var socket = v.Global.socket = io.connect();

  // Initial registration of client, request peer host info
  v.Serve.registerAsHost({ready: false});

  /**
   * Handle primary initialization message
   */
  socket.on('ready', function(initInfo) {
    v.Log.trace('initInfo', initInfo);
    v.Log.trace('initInfo.hosts', initInfo.hosts);

    // Register init message globally
    v.Global.init_info = initInfo;

    // Clear dead assets
    v.Cache.uncacheDeadAssets();

    // Load all available cached assets
    v.Cache.loadAllCachedAssets();

    // 1) No peers available OR environment not stable
    // -- download remaining assets from server
    // -- save downloaded files
    // -- start listening for peer connections
    // -- register as a ready host
    if (!initInfo.hosts.length || !v.Global.environment_stable) {
      v.Log.trace('vcdn ready: ', 'condition 1');
      v.Serve.getAssetsFromServer({});

      // Start a request handler for incoming peer connections
      v.Serve.startAssetRequestListener({
        id: v.Global.init_info.self.id,
        socket: v.Global.socket,
        handleRequest: v.Serve.handleSendingAssetRequest
      });
    }

    // 2) Peers available
    // -- register asset request listener in onBefore
    // -- download peer asset(s)
    else if (initInfo.hosts.length) {
      v.Log.trace('vcdn ready: ', 'condition 2');
      v.Serve.getAssetsFromPeers({
        hosts: initInfo.hosts,
        self: initInfo.self,
        socket: socket
      });
    }
  });




  // @TODO - Expose useful methods for API that will allow developers to use VCDN programatically.
  return function( elm ) {
    return {
      //registerNewAsset: v.Serve.registerNewAsset
    }
  };
}(vcdn || {}));
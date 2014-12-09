var vcdn = (function(v) {

  // @TODO - Develop functionality for sharing large media assets (video streams, etc.)

  // @TODO - Develop testing "framework"

  // @TODO - Finish asset watcher fail backs

  // @TODO - Calculate transfer latency for each peer, fail a peer if they're taking to long

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

    // Immediately record and compute peer's time difference with server
    initInfo.self.diff_time = v.Util.timestamp(-initInfo.self.vcdn_time);

    // Register init message globally and add array to store expired hosts
    initInfo.expired = [];
    v.Global.init_info = initInfo;

    // Clear dead assets
    v.Cache.uncacheDeadAssets();

    // Load all available cached assets
    v.Cache.loadAllCachedAssets();

    // 1) No peers available OR environment not stable
    if (!initInfo.hosts.length) {
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
    }
  };
}(vcdn || {}));
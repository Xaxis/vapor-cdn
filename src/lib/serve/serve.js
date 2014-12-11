(function(v) {
  v.Serve = {};

  /**
   * Holds chunk request tasks for each peer host
   */
  v.Serve.requests = {};

  /**
   * Holds request watcher objects (which track asset requests in progress).
   */
  v.Serve.request_watchers = {};

  /**
   * The VCDN unload handler is responsible for closing all connections.
   */
  v.Serve.unload = function() {

    // @TODO - Change event to onunload after dev
    window.document.addEventListener('click', function() {

      // Disconnect all channels/connections
      v.Util.forEach(v.Global.peer_asset_connections, function( p2pc, key ) {
        if (key != v.Global.init_info.self.id) {
          var channel = p2pc.channels.peerAssetsConnection;

          // Close/reset the data channel
          channel.close();
        }
      });
    });

    // @TODO - This method seems to work, however the close event will not fire if the data channel was never fully
    // @TODO - established on both ends. Therefore we need to intelligently use an asset's watcher as well to make
    // @TODO - sure we can fully handle disconnecting peers.
    window.addEventListener("beforeunload", function(e) {

      // Disconnect all channels/connections
      v.Util.forEach(v.Global.peer_asset_connections, function( p2pc, key ) {
        if (key != v.Global.init_info.self.id) {
          var channel = p2pc.channels.peerAssetsConnection;

          // Close/reset the data channel
          channel.close();
        }
      });

      // Clear global interval
      clearInterval(v.Global.watcher.interval);

      // Prompt or no prompt
      if (v.Global.unload.prompt) {
        e.returnValue = v.Global.unload.message;
      } else {
        return false;
      }
    });
  }();

  /**
   * Signals VCDN server that client is ready to act as a host.
   *
   * @param options {Object} Parameters
   * @param options.ready {Boolean} Flag indicating ready to host
   * @param options.limit {Number} Limit the returned peer host objects
   * @param options.assets {Object} An assets object to parse and send to VCDN server for registration
   */
  v.Serve.registerAsHost = function( options ) {
    v.Log.trace('Registering as ready host.', options.assets);
    var
      ready_assets          = options.assets || {},
      assets                = {};

    // Iterate over ready assets and build an asset registration index to asssociate with peer
    for (var asset_key in ready_assets) {
      assets[asset_key] = {
        chunk_total: ready_assets[asset_key].chunks.length
      };
    }

    // Configuration and available assets
    var config = {
      limit:        10,                               // Peer host retrieval limit
      assets:       assets                            // Available hosted assets
    };

    // On ready state true secondary registration
    if (options.ready) {
      config.ready      = true;                                      // Ready state flag
      config.diff_time  = v.Global.init_info.self.diff_time;         // Peer/VCDN time difference
    }

    // Send to vcdn server
    v.Global.socket.emit('register', config);
  };

  /**
   * Initializes asset request listeners for each peer.
   *
   * @param options {Object} Parameters
   * @param options.id {String} P2PC peerConnection name
   * @param options.id_prefix {String} P2PC peerConnection name suffix
   * @param options.socket {Object} Override the global socket
   * @param options.message {Object} A message to send back to the requesting peer
   * @param options.handleRequest {Function} A callback to handle sending messages back to requesting peer
   * @returns {Object} The P2PC class instance object
   */
  v.Serve.startAssetRequestListener = function( options ) {
    var
      id                = options.id,
      prefix            = options.id_prefix || '',
      socket            = options.socket,
      connection_id     = prefix + id;

    // Create new peer connection object with signaling channel
    var peerAssetsConnection =
      v.Global.peer_asset_connections[connection_id] =
        v.Global.peer_asset_connections[connection_id] ||
        v.P2PC({
            id: id,
            signal: v.P2PS({
              socket: socket
            })
          }
        );

    // Respond to data asset request from peer
    peerAssetsConnection.newListeningChannel({
      channel_id: 'peerAssetsConnection',
      onDataChannelReady: function( c ) {
        v.Log.trace('onDataChannelReady:', c);

        // When a handle request callback is passed
        if (options.handleRequest) {
          options.handleRequest.call(this, c);
        }

        // Otherwise, send message back to peer
        else {
          c.channel.send(JSON.stringify(options.message));
        }
      }
    });
    return peerAssetsConnection;
  };

  /**
   * Creates a list of all available assets from all available hosts.
   *
   * @param hosts {Object} Host asset objects containing available assets
   * @returns {Array}
   */
  v.Serve.getPeerHostedAssetsList = function( hosts ) {
    var ret = [];
    v.Util.forEach(hosts, function(host) {
      v.Util.forEach(host.assets, function(assets, asset_id) {
        var nons_asset_id = asset_id.replace(/^vapor\.file\./, '');
        if (ret.indexOf(nons_asset_id) == -1) ret.push(nons_asset_id);
      });
    });
    return ret;
  };

  /**
   * Builds asset request message to send to a peers.
   *
   * @param options {Object} Parameters
   * @param options.hosts {Object} Available host list config objects
   * @param options.assets {Array} Array of assets to retrieve from peers
   * @returns {Object}
   */
  v.Serve.buildAssetsRequestMessage = function( options ) {
    var
      ret           = {},
      hosts         = options.hosts,
      assets        = options.assets,
      hosts_count   = hosts.length;

    // Iterate over each asset
    assets.forEach(function( asset_url ) {
      var chunk_id = 1;
      hosts.forEach(function( host, index ) {
        var asset_id = v.Global.cache_prefix + 'file.' + asset_url;

        // Proceed only when host has asset
        if ((v.Global.cache_prefix + 'file.' + asset_url) in host.assets) {
          var
            chunk_total       = host.assets[asset_id].chunk_total,
            max_chunk_count   = (hosts_count > chunk_total) ? chunk_total : hosts_count,
            chunks_per_host   = Math.floor(chunk_total / max_chunk_count),
            chunks_remainder  = chunk_total % max_chunk_count,
            low_end           = index * chunks_per_host,
            high_end          = low_end + chunks_per_host;

          // Create asset chunks request
          ret[host.id] = ret[host.id] || {};
          ret[host.id][asset_url] = {
            chunks: []
          };

          // Delegate asset's chunk IDs to host
          if (chunk_id <= chunk_total) {
            for (var i = low_end; i < high_end; i++) {
              ret[host.id][asset_url].chunks.push(chunk_id);
              chunk_id++;
            }
          }

          // Give remainder chunks to first host
          if (chunks_remainder && index == 0) {
            for (var r = 0; r < chunks_remainder; r++) {
              ret[host.id][asset_url].chunks.push(chunk_id);
              chunk_id++;
            }
          }
        }
      });
    });
    return ret;
  };

  /**
   * Builds an asset request tracking object used to monitor which chunks of an asset have been received and which have
   * been requested.
   *
   * @param requests {Object} A requests object return from v.Serve.buildAssetsRequestMessage
   * @returns {Object}
   */
  v.Serve.buildAssetsRequestTracker = function( requests ) {
    var ret = {};

    // Iterate over each peer and each peer's assigned asset
    v.Util.forEach(requests, function( req, peer_id ) {
      v.Util.forEach(req, function( asset, asset_id ) {
        ret[asset_id] = ret[asset_id] || {
          id: asset_id
        };

        // Set chunk IDs of pending chunks
        var chunks_pending = ret[asset_id].chunks_pending ? ret[asset_id].chunks_pending.concat(asset.chunks) : asset.chunks;
        ret[asset_id].chunks_pending = chunks_pending;
        ret[asset_id].chunks_received = [];
        ret[asset_id].chunks = [];

        // Set chunk request watcher object
        ret[asset_id].watcher = ret[asset_id].watcher || {
          id: asset_id,
          speed: v.Global.watcher.request_speed,
          timeout: v.Global.watcher.request_timeout,
          elapsed: 0,
          watcher: null,
          finished: false
        };

        // Initialize chunk request watcher
        ret[asset_id].watcher.watcher
          = ret[asset_id].watcher.watcher
          || v.Serve.startAssetWatcher.call(ret[asset_id]);
      });
    });
    return ret;
  };

  /**
   * Responsible for monitoring the progress of individual asset requests to peers. Should be called in the context of
   * v.Serve.request_watchers[asset_id].
   *
   * @params options {Object} Parameters
   */
  v.Serve.startAssetWatcher = function() {
    var ctx = this;
    return setInterval(function() {
      ctx.watcher.elapsed += v.Global.watcher.request_speed;

      // Handle asset timeout
      if (ctx.watcher.elapsed >= v.Global.watcher.request_timeout) {
        console.log('Asset watcher timed out!', ctx);
        clearInterval(ctx.watcher.watcher);
      }

      // Handle asset download completion
      if (ctx.chunks_pending.length == ctx.chunks_received.length) {
        var
          elms        = v.Cache.getCacheableAssets('['+ v.Global.asset_attrib+'="'+ctx.id+'"]'),
          data        = ctx.chunks,
          data_blob   = new Blob(data);

        // Clear the watching interval
        clearInterval(ctx.watcher.watcher);

        // Load asset into DOM
        v.Cache.loadAssetToDom(elms, data_blob);

        // Cache asset for serving
        v.Cache.cacheAsset({
          elm: elms[0],
          blob: data_blob
        });

        // Set flag indicating asset is completely downloaded
        ctx.watcher.finished = true;

        // Log the completion of a downloaded asset
        v.Log.trace('startAssetWatcher', ctx.id + ' loaded and cached.');
      }
    }, ctx.watcher.speed);
  };

  /**
   * Responsible for monitoring the progress of all active/pending asset requests across all peers.
   *
   * @param requests {Object} The v.Serve.request_watchers object
   * @returns {Number} A reference to the global asset watcher interval
   */
  v.Serve.startGlobalAssetWatcher = function( requests ) {
    var
      keys              = v.Util.keys(v.Global.watcher.assets),
      asset_count       = keys.length,
      assets_finished   = [];
    return setInterval(function() {

      // Increment elapsed time
      v.Global.watcher.elapsed += v.Global.watcher.global_speed;

      // Handle a global watcher timeout
      if (v.Global.watcher.elapsed >= v.Global.watcher.global_timeout) {
        v.Log.trace('startGlobalAssetWatcher', 'Global watcher expired!');
        v.Global.watcher.elapsed = 0;
        clearInterval(v.Global.watcher.interval);
      }

      // When peer asset requests have been made
      if (requests) {

        // Iterate over pending/active peer asset download requests
        for (var asset_id in requests) {
          var request = requests[asset_id];

          // Handle updating peer downloaded asset requests status objects
          if (request.watcher.finished && !v.Global.watcher.assets[asset_id].finished) {
            v.Global.watcher.assets[asset_id].finished = true;
          }
        }
      }

      // Iterate over ALL peer/server download requests
      for (var asset_id in v.Global.watcher.assets) {
        var asset_status = v.Global.watcher.assets[asset_id];
        if (asset_status.finished && assets_finished.indexOf(asset_id) == -1) assets_finished.push(asset_id);
        if (assets_finished.length == asset_count) {

          // Clear the global watcher interval
          clearInterval(v.Global.watcher.interval);

          // Register as an available host
          v.Serve.registerAsHost({
            ready: true,
            assets: v.Global.storage
          });
        }
      }

    }, v.Global.watcher.global_speed);
  };

  /**
   * Initializes the global status watcher/tracker.
   *
   * @param assets {Array} The asset_ids that should be watched
   */
  v.Serve.initGlobalStatusWatcher = function( assets ) {

    // Build all asset tracking list
    v.Global.watcher.assets = v.Serve.buildAssetsRequestList(assets);
    //v.Log.trace('v.Global.watcher.assets', v.Global.watcher.assets);

    // Attach/initialize global peer download asset tracker
    if (v.Util.keys(v.Serve.request_watchers).length) {
      v.Global.watcher.interval = v.Serve.startGlobalAssetWatcher(v.Serve.request_watchers);
    } else {
      v.Global.watcher.interval = v.Serve.startGlobalAssetWatcher();
    }
  };

  /**
   * Builds and sends asset chunks w/ header data to the requesting peers.
   *
   * @param c {Object} The P2PC onDataChannelReady modified channel object
   */
  v.Serve.handleSendingAssetRequest = function( c ) {
    var requests = JSON.parse(c.data);

    // Send requested asset chunks to peer
    for (var asset_key in requests) {
      var
        asset_req     = requests[asset_key],
        asset_id      = v.Global.cache_prefix + 'file.' + asset_key,
        asset_chunks  = v.Global.storage[asset_id].chunks;

      // Encode each requested chunk with a fixed length byte header and send to peer
      asset_req.chunks.forEach(function( chunk_id ) {
        var
          chunk_to_send   = asset_chunks[chunk_id-1],
          header_str      =
            chunk_id + ':' +                                                      // Chunk ID
            asset_chunks.length + ':'                                             // Total chunk count
            + v.Util.timestamp(-v.Global.init_info.self.diff_time) + ':'          // Corrected timestamp
            + asset_id,                                                           // Asset URI
          header          = new Blob([v.Util.str2ab(v.Util.padString(header_str, '/', v.Global.header_length))]),
          chunk           = new Blob([header, chunk_to_send]);

        // Send chunk to peer
        c.channel.send(chunk);

        // Update total bytes sent
        v.Global.wire.bytes_sent += chunk.size;

        // Build channel reference for any missing connecting peers
        if (!v.Global.peer_asset_connections[c.message.client_id]) {
          v.Global.peer_asset_connections[c.message.client_id] = {
            id: c.message.client_id,
            channels: {
              peerAssetsConnection: c.channel
            }
          };
        }
      });
    }
  };

  /**
   * Handles the receiving of peer signaling messages and requested asset chunks.
   *
   * @param c {Object} The P2PC onDataChannelMessage modified channel object
   */
  v.Serve.handleReceivingRequest = function( c ) {

    // Proceed only when a host is not expired
    if (v.Global.init_info.expired.indexOf(c.peer_id) == -1) {
      var chunk = c.data;

      // Update total bytes received
      v.Global.bytes_received += chunk.size;

      // Decode the header and data chunk from each received chunk
      v.Serve.receiveAssetChunk(chunk, function( chunk_obj ) {
        var
          chunk_timestamp         = chunk_obj.chunk_timestamp,
          receiving_time          = v.Util.timestamp(-v.Global.init_info.self.diff_time),
          chunk_elapsed_time      = Math.abs(chunk_timestamp - receiving_time),
          asset_key               = chunk_obj.id,
          asset_id                = asset_key.replace(v.Global.cache_prefix + 'file.', ''),
          asset_req               = v.Serve.request_watchers[asset_id],
          chunk_id                = chunk_obj.chunk_id,
          chunk                   = chunk_obj.chunk,
          chunks                  = asset_req.chunks,
          chunks_total            = chunk_obj.chunk_total,
          chunks_received         = asset_req.chunks_received,
          watcher                 = v.Serve.request_watchers[asset_id].watcher,
          request                 = v.Serve.requests[c.peer_id][asset_id];

        // Update the chunk id received for each peer for each asset in the v.Serve.requests object
        request.chunks_received = request.chunks_received || [];
        var chunks_received_per = (request.chunks_received ? request.chunks_received.length : 1) + 1;

        // Update the chunk id received in the v.Serve.requests_watcher object
        chunks_received.push(chunk_id);
        request.chunks_received.push(chunk_id);

        //console.log('estimate_dl_time', request.status.estimated_dl_time);
        //var connection = v.Global.peer_asset_connections[c.peer_id].connects[c.peer_id].connection;
        //connection.getStats(function() {}, function() {}, function() {});

        // Place the asset chunk in the chunk buffer at the appropriate index
        chunks[(chunk_id-1)] = chunk;

        //console.log('watcher', watcher);
        //console.log('last chunk DL time: ', c.peer_id, request.status.last_chunk_dl_time);
        //console.log('actual total DL time: ', request.status.actual_dl_time);
        //console.log('request status: ', request);
        //console.log('From: ', c.peer_id, ' Receiving chunk ', chunk_id, ' of asset: ', asset_id);
        //console.log('Receiving data...');
      });
    }
  };

  /**
   * Handles the header and data parsing of a received asset chunk.
   *
   * @param chunk {Blob} The data chunk to act on
   * @param onReady {Function} The callback to fire on each data chunk
   */
  v.Serve.receiveAssetChunk = function( chunk, onReady ) {
    var
      header    = chunk.slice(0, v.Global.header_length),
      data      = chunk.slice(v.Global.header_length, chunk.size),
      reader    = new FileReader();

    // Read in chunk
    reader.onload = function() {
      var
        header_str        = v.Util.ab2str(this.result).replace(/\/*$/, ""),
        chunk_id          = header_str.indexOf(':'),
        chunk_total       = '',
        chunk_timestamp   = '';

      // Retrieve relevant values from header
      chunk_id          = header_str.substring(0, chunk_id);
      header_str        = header_str.substring(chunk_id.length+1, header_str.length);
      chunk_total       = header_str.indexOf(':');
      chunk_total       = header_str.substring(0, chunk_total);
      header_str        = header_str.substring(chunk_total.length+1, header_str.length);
      chunk_timestamp   = header_str.indexOf(':');
      chunk_timestamp   = header_str.substring(0, chunk_timestamp);
      header_str        = header_str.substring(chunk_timestamp.length+1, header_str.length);

      // Assign values to onReady arguments object
      var params = {
        id: header_str,
        chunk: data,
        chunk_id: parseInt(chunk_id),
        chunk_total: parseInt(chunk_total),
        chunk_timestamp: chunk_timestamp
      };

      // Execute onReady callback for each chunk
      onReady.apply(this, [params]);
    };
    reader.readAsArrayBuffer(header);
  };

  /**
   * Returns the initialization info object that relates to a specific peer host in the v.Global.init_info object.
   *
   * @param peer_id {String} The socket ID of the target peer
   * @returns {Object}
   */
  v.Serve.getPeerHostInfo = function( peer_id ) {
    var
      hosts     = v.Global.init_info.hosts,
      h_len     = hosts.length,
      ret       = null;
    for (var i = 0; i < h_len; i++) {
      var host = hosts[i];
      if (host.id == peer_id) {
        ret = {
          index: i,
          host: host
        };
        break;
      }
    }
    return ret;
  };

  /**
   * Returns a list of available hosts that are still active (viable serving hosts).
   *
   * @param hosts {Object} A reference to a collection of p2pc objects
   * @returns {Array} List of active hosts by their reference (socket) id
   */
  v.Serve.getActiveHosts = function( hosts ) {
    var active_hosts = [];

    // Iterate over p2pc connection objects
    v.Util.forEach(hosts, function(host, host_id) {
      if (host.connects[host_id].connection.signalingState == 'stable') {
       active_hosts.push(host_id);
      }
    });
    return active_hosts;
  };

  /**
   * Removes all inactive hosts from the passed p2pc collection.
   *
   * @param hosts {Object} A reference to a collection of p2pc objects.
   */
  v.Serve.cleanupHosts = function( hosts ) {
    var active_hosts = v.Serve.getActiveHosts(hosts);

    // Iterate over p2pc connection objects
    v.Util.forEach(hosts, function(host, host_id) {
      if (active_hosts.indexOf(host_id) == -1) {
        delete hosts[host_id];
      }
    });
  };

  /**
   * Method is responsible for reallocating asset requests to alternate peers or failing over requests to the server
   * when no further peers are available.
   *
   * @param peer_id {String} The peer ID of the disconnected peer
   */
  v.Serve.handleBrokenRequests = function( peer_id ) {
    var
      hosts               = v.Global.init_info.hosts,
      connections         = v.Global.peer_asset_connections,
      missing_assets      = {};

    // Proceed only when this peer connection still exists
    if (peer_id in connections) {

      // Iterate over assets and determine the missing chunks for each
      v.Util.forEach(v.Serve.requests[peer_id], function( asset_request, asset_id ) {
        var chunks_requested = asset_request.chunks;
        var chunks_received = asset_request.chunks_received;
        var chunks_diff = v.Util.diffArray(chunks_requested, chunks_received || []);

        // Assign an assets missing chunks by asset id
        if (chunks_diff.length) {
          missing_assets[asset_id] = missing_assets[asset_id] || {};
          missing_assets[asset_id].chunks = chunks_diff;
        }
      });

      // Remove global peer connection object
      delete connections[peer_id];

      // Remove init info related to connection
      var host_info = v.Serve.getPeerHostInfo(peer_id);
      hosts.splice(host_info.index, 1);

      // Remove the peer's request object
      delete v.Serve.requests[peer_id];

      // If further hosts available and asset chunks are missing, request from another peer.
      if (v.Global.init_info.hosts.length && v.Util.keys(missing_assets).length) {
        var host = v.Util.first(hosts);
        var channel = connections[host.id].channels['peerAssetsConnection'];

        // Request assets from peer
        channel.send(JSON.stringify(missing_assets));
      }

      // If we have no additional peers, retrieve missing assets from server
      else {
        v.Serve.getAssetsFromServer({noWatcher: true});
      }
    }
  };

  /**
   * Returns a status tracking object for each asset.
   *
   * @param assets {Array} An array of all asset IDs
   * @returns {Object} Assets status tracking object
   */
  v.Serve.buildAssetsRequestList = function( assets ) {
    var
      list          = {},
      cached        = v.Cache.getCachedAssetList(),
      req_assets    = v.Util.diffArray(assets, cached);
    v.Util.forEach(req_assets, function( asset_id ) {
      list[asset_id] = {
        finished: false
      };
    });
    return list;
  };

  /**
   * Establishes connections with peer hosts and downloads assets.
   *
   * @param options {Object} Parameters
   * @param options.self {String} Socket ID
   * @param options.hosts {Array} Available peer host objects
   * @param options.socket {Object} Socket to pass to p2pc
   * @param options.requests {Object} The already built v.Serve.requests object
   */
  v.Serve.getAssetsFromPeers = function( options ) {
    var
      assets_hosted         = v.Serve.getPeerHostedAssetsList(options.hosts),
      assets_needed         = v.Util.arrayRemoveDuplicates(v.Cache.getCacheableAssetList()),
      assets_served         = v.Util.getArrayValuesEqual(assets_needed, v.Util.diffArray(assets_needed, assets_hosted)),
      assets_needed_peers   = v.Util.diffArray(v.Util.getArrayValuesEqual(assets_needed, v.Util.diffArray(assets_needed, assets_served)), v.Cache.getCachedAssetList());

    //console.log('assets_hosted', assets_hosted);
    //console.log('assets_needed', assets_needed);
    //console.log('assets_needed_peers', assets_needed_peers);
    //console.log('assets_served', assets_served);

    // When there are assets needed from peers
    if (assets_needed_peers.length) {

      // Build asset chunk request(s) message for peers (assists in monitoring downloads from peers)
      v.Serve.requests = v.Serve.buildAssetsRequestMessage({hosts: options.hosts, assets: assets_needed_peers});
      v.Log.trace('v.Serve.requests', v.Serve.requests);

      // Update the request(s) tracking object (assists in monitoring downloads from peers)
      v.Serve.request_watchers = v.Serve.buildAssetsRequestTracker(v.Serve.requests);
      //v.Log.trace('v.Serve.request_watchers', v.Serve.request_watchers);
    }

    // Initialize global status watcher/tracker
    v.Serve.initGlobalStatusWatcher(assets_needed);

    // When there are assets need from peers
    if (assets_needed_peers.length) {

      // Iterate through each peer host
      v.Util.forEach(v.Global.init_info.hosts, function( host ) {

        // Start a new asset request listener
        var peerAssetsConnection = v.Serve.startAssetRequestListener({
          id: host.id,
          socket: options.socket,
          handleRequest: v.Serve.handleSendingAssetRequest
        });

        // Define a call handler for each host
        peerAssetsConnection.openListeningChannel({
          client_id: options.self.id,
          channel_id: 'peerAssetsConnection',
          connection_id: host.id,

          // Request assets from peers
          onDataChannelOpen: function( c )  {
            //v.Log.trace('onDataChannelOpen:', 'Requesting assets', c, v.Serve.requests[host.id]);
            c.channel.send(JSON.stringify(v.Serve.requests[host.id]));
          },

          // Receive assets from peers
          onDataChannelMessage: function( c ) {
            //v.Log.trace('onDataChannelMessage:', 'Receiving assets', c);
            v.Serve.handleReceivingRequest(c);
          },

          // Handle disconnecting peers
          onDataChannelClose: function( c ) {
            //v.Log.trace('onDataChannelMessage:', 'Closed channel', c);
            v.Serve.handleBrokenRequests(c.peer_id);
          },

          // Handle errors
          onDataChannelError: function( c ) {
            //v.Log.trace('onDataChannelError:', 'error', c);
          }
        });
      });
    }

    // Get any assets not available from peers from server
    if (assets_served.length) {
      v.Serve.getAssetsFromServer({assets: assets_served});
    }
  };

  /**
   * A wrapper to v.Cache.getAllAssetsFromServer. Responsible for determining which assets are remaining and loading
   * those assets from the server via an AJAX request.
   *
   * @param options {Object} Parameters
   * @param options.assets {Array} List of specific assets to retrieve
   * @param options.noWatcher {Boolean} Flag indicating not to re-init the global watcher
   */
  v.Serve.getAssetsFromServer = function( options ) {
    var assets_needed = null;

    // When specific assets are being requested
    if (options.assets) {
      assets_needed = options.assets;
    } else {
      assets_needed = v.Cache.getCacheableAssetList();

      // Initialize global status watcher/tracker
      if (!options.noWatcher) {
        v.Serve.initGlobalStatusWatcher(assets_needed);
      }
    }

    // Retrieve assets from server
    v.Cache.getAllAssetsFromServer({
      list: assets_needed,
      onReady: function( elm, uri ) {
        v.Log.trace('Downloaded asset from server: ', uri);

        // Update asset as finished
        v.Global.watcher.assets[uri].finished = true;
      }
    });
  };

  return v;
}(vcdn || {}));
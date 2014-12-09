var vcdn = (function(v, global) {
  v.Global = {

    // The asset attribute
    asset_attrib: 'data-vcdn',

    // Default base URL
    base_url: '/',

    // Default storage prefix
    cache_prefix: 'vapor.',

    // Chunk size
    chunk_size: 1000000,

    // Enable debugging
    debug: true,

    // Default debugging message prefix
    default_trace_msg: 'module_name: ',

    // Function returns a flag indicating whether or not client is capable of supporting VCDN
    environment_stable: function() {
      var
        stable    = true,
        tests     = {
          webrtc_1: [
            window.RTCPeerConnection,
            window.mozRTCPeerConnection,
            window.webkitRTCPeerConnection
          ],
          webrtc_2: [
            window.mozRTCIceCandidate,
            window.RTCIceCandidate
          ],
          webrtc_3: [
            window.RTCSessionDescription,
            window.mozRTCSessionDescription,
            window.RTCSessionDescription
          ],
          webrtc_4: [
            navigator.getUserMedia,
            navigator.mozGetUserMedia,
            navigator.webkitGetUserMedia
          ],
          storage: [
            window.localStorage,
            window.sessionStorage
          ],
          time: [
            window.Date.now
          ]

        };

      // Run tests
      for (var t in tests) {
        var test_group = tests[t];
        var test_stable = false;

        // Iterate over each test group
        for (var i = 0; i < test_group.length; i++) {
          if (test_group[i]) test_stable = true;
        }

        // If no test was truthy per group, set 'stable' to false
        if (!test_stable) stable = false;
      }

      // Return the environments stability
      return stable;
    }(),

    // Header byte length
    header_length: 2222,

    // Init message
    init_info: null,

    // Reference P2PC object(s)
    peer_asset_connections: {},

    // P2PC configurations
    p2pc: {

      // Data channel configuration
      dc_config: {
        ordered: true,
        reliable: false
        //maxRetransmits: 0
      },

      // Connection configuration
      p2pc_config: {
        optional: [
          {DtlsSrtpKeyAgreement: true},
          {RtpDataChannels: true}
        ]
      },

      // STUN server configuration
      stun_config: {
        iceServers: [
          { url: "stun:23.21.150.121" },
          { url: "stun:stun.l.google.com:19302" }
        ]
      }
    },

    // Reference to active socket.io socket
    socket: null,

    // Asset storage (where retrieved asset data is stored)
    storage: {},

    // Holds default storage mode ('session', 'local', 'indexed', or 'hybrid')
    storage_mode: 'session',

    // Initialize Super Globals
    super_globals: function() {
      var globals = {

        // WebRTC
        PeerConnection: window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection,
        IceCandidate: window.mozRTCIceCandidate || window.RTCIceCandidate,
        SessionDescription: window.RTCSessionDescription || window.mozRTCSessionDescription || window.RTCSessionDescription,
        getUserMedia: navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia,

        // Storage
        IndexedDB: window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB,
        IDBTransaction: window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction,
        IDBKeyRange: window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange
      };

      // Attach super_globals globals to global scope
      for (var key in globals) {
        global[key] = globals[key];
      }
      return true;
    }(),

    // A flag indicating whether a user is prompted or not to unload the page
    unload: {
      prompt: false,
      message: 'Disconnecting will prevent users from receiving website assets. Continue?'
    },

    // Global watcher config
    watcher: {
      assets: null,                     // Holds status objects of all assets needed
      elapsed: 0,                       // Time passed since needed assets began downloading
      interval: null,                   // A reference to the global watcher interval
      global_speed: 50,                 // How often the global watcher interval iterates
      global_timeout: 50000,            // The time in MS in which the global watcher times out
      request_speed: 50,                // How often an asset watcher interval iterates
      request_timeout: 5000,            // The time in MS in which an asset watcher times out
      finished: true,                   // A flag indicating all assets have downloaded
      chunk_timeout_multiple: 4         // A multiple used by the max timeout for a chunk from a given peer
    },

    // Holds data related to bandwidth/latency/connection monitoring
    wire: {
      bytes_sent: 0,
      bytes_received: 0
    }
  };

  return v;
}(vcdn || {}, window));
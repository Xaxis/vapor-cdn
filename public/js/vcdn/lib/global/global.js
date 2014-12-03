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

    // A flag indicating whether or not client is capable of supporting VCDN technologies
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

    // Asset storage list (index used to track asset download progress)
    // @TODO - Remove, this is unused.
    storage_list: {},

    // Holds default storage mode ('session', 'local', 'indexed', or 'hybrid')
    storage_mode: 'session',

    // Initialize Super Globals
    super: function() {
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

      // Attach super globals to global scope
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
      assets: null,
      elapsed: 0,
      interval: null,
      global_speed: 50,
      global_timeout: 50000,
      request_speed: 50,
      request_timeout: 5000,
      request_timeout_multiple: 2,
      finished: true
    }
  };

  return v;
}(vcdn || {}, window));
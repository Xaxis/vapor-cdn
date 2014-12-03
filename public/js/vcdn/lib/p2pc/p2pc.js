var vcdn = (function(v) {
  v.P2PC = function( config ) {

    /**
     * Initializes a VCDN peer-to-peer connection object.
     *
     * @param config {Object} Parameters
     * @param config.id {String} Reference ID of the peerConnection object
     * @param config.signal {Object} An instance of the P2PS signaling object
     * @param config.connects {Object} An ID referenced object literal of peerConnection objects
     * @param config.channels {Object} An ID referenced object literal of dataChannel objects
     * @param config.p2pc_config {Object} A default peerConnection configuration object
     * @param config.dc_config {Object} A default dataChannel configuration object
     * @param config.stun_config {Object} A default stun server configuration object
     * @param config.p2pc_handler {Object} An object literal of default peerConnection event handlers
     * @param config.dc_handler {Object} An object literal of default dataChannel event handlers
     * @constructor
     */
    var P2PC = function( config ) {
      return {

        // The P2PC instance name
        id: config.id,

        // The signaling channel instance
        p2ps: config.signal,

        // Corresponding incoming/outgoing connections hash
        connects: config.connects || {},

        // Connections data channels hash
        channels: config.channels || {},
        
        // P2PC configuration
        p2pc_config: config.p2pc_config || v.Global.p2pc.p2pc_config || {
          optional: [
            {DtlsSrtpKeyAgreement: true},
            {RtpDataChannels: true}
          ]
        },

        // DataChannel configuration
        dc_config: config.dc_config || v.Global.p2pc.dc_config || {
          ordered: true,
          reliable: false
        },

        // STUN configuration
        stun_config: config.stun_config || v.Global.p2pc.stun_config || [
          { url: "stun:23.21.150.121" },
          { url: "stun:stun.l.google.com:19302" }
        ],
        
        // Define connection handlers
        p2pc_handler: {
          onaddstream: config.onaddstream || function(e) {
            v.Log.trace('onaddstream::', e);
          },
          onclosedconnection: config.onclosedconnection || function(e) {
            v.Log.trace('onclosedconnection::', e);
          },
          onicecandidate: config.onicecandidate || function(e) {
            v.Log.trace('onicecandidate::', e);
          },
          onconnectionstatechange: config.onconnectionstatechange || function(e) {
            v.Log.trace('onconnectionstatechange::', e);
          },
          onnegotiationneeded: config.onnegotiationneeded || function(e) {
            v.Log.trace('onnegotionationneeded::', e);
          },
          onremovestream: config.onremovestream || function(e) {
            v.Log.trace('onremovestream::', e);
          },
          onsignalingstatechange: config.onsignalingstatechange || function(e) {
            v.Log.trace('onsignalingstatechange::', e);
          },
          ondatachannel: config.ondatachannel || function(e) {
            v.Log.trace('ondatachannel::', e);
          }
        },
        
        // Define data channel handlers
        dc_handler: {
          onopen: config.onopen || function(e) {
            v.Log.trace('onopen::', e);
          },
          onerror: config.onerror || function(e) {
            v.Log.trace('onerror::', e);
          },
          onmessage: config.onmessage || function(e) {
            v.Log.trace('onmessage::', e);
          },
          onclose: config.onclose || function(e) {
            v.Log.trace('onclose::', e);
          }
        },

        /**
         * Extends the properties of one or more objects onto the first object.
         *
         * @returns {Object}
         */
        extend: function() {
          var
            objs    = v.Util.toArray(arguments),
            target  = objs.shift();
          objs.forEach(function(source) {
            for (var key in source) {
              target[key] = source[key];
            }
          });
          return target;
        },

        /**
         * Handle offer/answer connection listening and establish an associated data channel.
         *
         * @param options {Object} Parameters
         * @param options.channel_id {String} Reference ID of the peerConnection object
         * @param options.p2pc_config {Object} Configuration overrides for a new peerConnection object
         * @param options.onDataChannelReady {Function} Event handler override for the 'ondatachannel' event
         */
        newListeningChannel: function( options ) {
          var p2pc                = this,
              p2ps                = this.p2ps,
              connection_id       = '',
              p2pc_config         = options.p2pc_config || this.p2pc_config,
              onDataChannelReady  = options.onDataChannelReady;

          // PEER/CLIENT - Listen for offers/answers
          p2ps.onmessage(options.channel_id + '_Listener', function(message) {

            // Reference the SDP message
            var sdp = message.message;

            // PEER - Respond to client offers
            if (sdp.type == 'offer') {
              connection_id = message.peer_id;

              // Build responding connection
              p2pc.newPeerConnection({
                connection_id: connection_id,
                p2pc_config: p2pc_config,
                p2pc_handler: {
                  ondatachannel: function(e) {
                    var channel = e.channel;

                    // Create a new data channel and store a reference in the p2pc class object
                    p2pc.newDataChannel({
                      id: e.channel.label,
                      channel: channel
                    });

                    // Handle the channel message
                    channel.onmessage = function(e) {
                      if (onDataChannelReady) {
                        onDataChannelReady.apply(this, [{
                          this: this,
                          channel: channel,
                          data: e.data,
                          message: message,
                          event: e
                        }]);
                      }
                    };
                  }
                }
              });

              // Respond to client with answer
              p2pc.answerPeerOffer(connection_id, sdp, function(answer) {
                p2ps.send(options.channel_id + '_Listener', message.client_id, message.peer_id, answer);
              });
            }

            // CLIENT - Respond to peer answers
            else if (sdp.type == 'answer') {
              connection_id = message.client_id;

              // Set remote description with peer's answer
              p2pc.setRemoteDescription(connection_id, sdp);
            }
          });
        },

        /**
         * Opens/creates a data channel on a connection when it exists. When connection does not exist it is created.
         *
         * @param options {Object} Configuration object
         * @param options.channel_id {String} Reference ID to the created dataChannel object
         * @param options.client_id {String} Generally the ocket ID of the client sending
         * @param options.connection_id {String} Generally the socket ID of the peer to send to
         * @param options.p2pc_config {Object} Configuration overrides for a new peerConnection object
         * @param options.dc_config {Object} Configuration overrides for a new dataChannel object
         * @param options.dc_handler {Object} An object literal of dataChannel event overrides
         * @param options.onDataChannelMessage {Function} Wrapper event for dataChannel onmessage
         * @param options.onDataChannelOpen {Function} Wrapper event for dataChannel onopen
         * @param options.onDataChannelClose {Function} Wrapper event for dataChannel onclose
         * @param options.onDataChannelError {Function} Wrapper event for dataChannel onerror
         */
        openListeningChannel: function( options ) {
          var
            p2pc                    = this,
            p2ps                    = this.p2ps,
            client_id               = options.client_id,
            channel_id              = options.channel_id,
            connection_id           = options.connection_id,
            p2pc_config             = options.p2pc_config || this.p2pc_config,
            dc_config               = options.dc_config || this.dc_config,
            dc_handler              = options.dc_handler || {},
            connection_init         = p2pc.getConnection(connection_id),
            onDataChannelMessage    = options.onDataChannelMessage,
            onDataChannelOpen       = options.onDataChannelOpen,
            onDataChannelClose      = options.onDataChannelClose || this.dc_handler.onclose,
            onDataChannelError      = options.onDataChannelError || this.dc_handler.onerror;

          // CLIENT - Create a calling peer connection
          if (!connection_init) {
            p2pc.newPeerConnection({
              connection_id: connection_id,
              p2pc_config: p2pc_config
            });
          }

          // CLIENT - Create a data channel on a connection
          p2pc.newDataChannel({
            channel_id: channel_id,
            connection_id: connection_id,
            dc_config: dc_config,
            dc_handler: this.extend({
              onopen: function(e) {
                onDataChannelOpen.apply(this, [
                  {
                    channel: p2pc.getDataChannel(connection_id, channel_id),
                    peer_id: connection_id,
                    event: e
                  }
                ]);
              },
              onmessage: function(e) {
                onDataChannelMessage.apply(this, [
                  {
                    channel: p2pc.getDataChannel(connection_id, channel_id),
                    peer_id: connection_id,
                    data: e.data,
                    event: e
                  }
                ]);
              },
              onclose: function(e) {
                onDataChannelClose.apply(this, [
                  {
                    channel: p2pc.getDataChannel(connection_id, channel_id),
                    peer_id: connection_id,
                    event: e
                  }
                ]);
              },
              onerror: function(e) {
                onDataChannelError.apply(this, [
                  {
                    channel: p2pc.getDataChannel(connection_id, channel_id),
                    peer_id: connection_id,
                    event: e
                  }
                ]);
              }
            }, dc_handler)
          });

          // CLIENT - Create connection offer & send offer to peer
          if (!connection_init) {
            p2pc.createClientOffer(connection_id, function(offer) {
              p2ps.send(channel_id + '_Listener', connection_id, client_id, offer);
            });
          }
        },

        /**
         * Creates a PeerConnection object and stores the connection in the class object. Then attaches the connections
         * default event handlers.
         *
         * @param options {Object} Parameters
         * @param options.connection_id {String} A peerConnection id
         * @param options.p2pc_config {Object} PeerConnection configuration overrides
         * @param options.p2pc_handler {Object} PeerConnection event overrides
         * @returns {Object}
         */
        newPeerConnection: function( options ) {
          var
            connection_id   = options.connection_id,
            p2pc_config     = options.p2pc_config || this.p2pc_config,
            p2pc_handler    = options.p2pc_handler || this.p2pc_handler;

          // Store connection reference in class object
          this.connects[connection_id] = {
            id: connection_id,
            sdp_offer: null,
            sdp_answer: null,
            connection: new PeerConnection(this.stun_config, p2pc_config),
            peer_connection: null
          };

          // Merge default handlers without overriding
          for (var default_handle in this.p2pc_handler) {
            if (!(default_handle in p2pc_handler) && this.p2pc_handler[default_handle]) {
              p2pc_handler[default_handle] = this.p2pc_handler[default_handle];
            }
          }

          // Attach handlers
          for (var handle in p2pc_handler) {
            if (p2pc_handler[handle]) {
              this.connects[connection_id].connection[handle] = p2pc_handler[handle];
            }
          }

          // Return a reference to the connection object
          return this.connects[connection_id].connection;
        },

        /**
         * Builds a data channel from a peer connection. When a data channel object is passed, a new channel is not
         * created but instead passed events are attached to it and it is stored in the class object per norm.
         *
         * @param options {Object} Parameters
         * @param options.channel {Object} A data channel object
         * @param options.id {String} The fully composed id (connection_id + '_' + channel_id)
         * @param options.connection_id {String} A peerConnection id (socket.io socket id)
         * @param options.channel_id {String} A dataChannel id
         * @param options.dc_config {Object} DataChannel configuration overrides
         * @param options.dc_handler {Object} DataChannel event overrides
         * @returns {Object}
         */
        newDataChannel: function( options ) {
          var
            id        = options.id || options.channel_id,
            channel   = options.channel || null,
            config    = options.dc_config || this.dc_config,
            handlers  = options.dc_handler || this.dc_handler;

          // Store the data channel
          this.channels[id] = channel ? channel : this.connects[options.connection_id].connection.createDataChannel(id, config);

          // Attach handlers to the data channel
          for (var handle in handlers) {
            this.channels[id][handle] = handlers[handle];
          }

          // Return the newly created data channel object
          return this.channels[id];
        },

        /**
         * Method acts as a wrapper to WebRTC PeerConnection's setRemoteDesription function.
         *
         * @param connection_id {String} A peerConnection id (socket.io socket id)
         * @param sdp {Object} An SDP description object
         * @param callback {Function} A callback to fire upon setting remote description
         */
        setRemoteDescription: function( connection_id, sdp, callback ) {
          if (connection_id in this.connects) {
            var connection_obj = this.connects[connection_id];
            connection_obj.connection.setRemoteDescription(new SessionDescription(sdp), function() {
              if (callback) {
                callback.call(this, connection_obj, connection_id, sdp);
              }
            }, v.Log.trace);
          }
        },

        /**
         * Creates a PeerConnection offer, then sets a connections local description, and then passes the offer to the
         * offerCallback callback function where signaling then can take place.
         *
         * @param connection_id {String} A peerConnection id (socket.io socket id)
         * @param offerCallback {Function} A callback to fire upon setting local description
         */
        createClientOffer: function( connection_id, offerCallback ) {
          var connectionObject = this.connects[connection_id];
          connectionObject.connection.createOffer(function(offer) {
            connectionObject.sdp_offer = offer;
            connectionObject.connection.setLocalDescription(offer, function() {
              if (offerCallback) {
                offerCallback.call(this, offer);
              }
            }, v.Log.trace);
          }, v.Log.trace);
        },

        /**
         * Sets an existing connection's Remote Description with an offer from a peer. Then creates a responding SDP answer
         * that is sent back to the caller. Then sets the existing connection's Local Description before executing the
         * answerCallback where signaling channel code is run.
         *
         * @param connection_id {String} A peerConnection id (socket.io socket id)
         * @param offer {Object} A SDP offer object
         * @param answerCallback {Function} A callback to fire upon setting local description
         */
        answerPeerOffer: function( connection_id, offer, answerCallback ) {
          var connectionObject = this.connects[connection_id];
          connectionObject.connection.setRemoteDescription(new SessionDescription(offer), function() {
            connectionObject.connection.createAnswer(function(answer) {
              connectionObject.connection.setLocalDescription(answer);
              if (answerCallback) {
                answerCallback.call(this, answer);
              }
            }, v.Log.trace);
          }, v.Log.trace);
        },

        /**
         * Returns a peer connection object if it exists.
         *
         * @param connection_id {String} A peerConnection id (socket.io socket id)
         * @returns {*}
         */
        getConnection: function( connection_id ) {
          if (connection_id in this.connects) {
            return this.connects[connection_id];
          } else {
            return false;
          }
        },

        /**
         * Returns a peer connection's data channel if it exists.
         *
         * @param connection_id {String} A peerConnection id (socket.io socket id)
         * @param channel_id {String} A dataChannel id
         * @returns {*}
         */
        getDataChannel: function( connection_id, channel_id ) {
          var id = channel_id;
          if (id in this.channels) {
            return this.channels[id];
          } else {
            return false;
          }
        }

      }
    };

    return P2PC(config);
  };
  return v;
}(vcdn || {}));
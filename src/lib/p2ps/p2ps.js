(function(v) {
  v.P2PS = function( options ) {

    /**
     * Constructor for P2PS
     *
     * @param options {Parameters}
     * @param options.socket {Object} Reference to socket.io socket
     * @returns {{socket: *}}
     * @constructor
     */
    var P2PS = function( options ) {
      return {

        // Reference the socket.io socket
        socket: options.socket,

        /**
         * Sends a message to a target peer handler.
         *
         * @param handler {String}
         * @param peer_id {String}
         * @param client_id {String}
         * @param message {Object}
         */
        send: function( handler, peer_id, client_id, message ) {
          this.socket.emit('P2PC_SendMessageToPeer', {
            handler: handler,
            peer_id: peer_id,
            client_id: client_id,
            message: message
          });
        },

        /**
         * Receives a message from a peer listening on a handler.
         *
         * @param handler {String}
         * @param callback {Function}
         */
        onmessage: function( handler, callback ) {
          this.socket.on(handler, function(message) {
            callback.call(this, message);
          });
        }
      }
    };

    return P2PS(options);
  };
  return v;
}(vcdn || {}));
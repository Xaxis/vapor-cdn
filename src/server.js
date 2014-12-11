// @TODO - Develop VCDN website
// The website is central to finding and supporting VCDN customers. Primary sections on the website should include:
// Landing, About, FAQ, Documentation, Registration, Account Administration.

// @TODO - Develop internal administration/monitoring system
// The VCDN SaaS is as good as useless if it can't monitor and administer its servers, services, users and data
// infrastructure. A comprehensive internal administration and monitoring system is required for VCDN to be successful.

// @TODO - Develop internal and external documentation
// As part of the VCDN website, documentation is essential for both VCDN administers and internal maintainers of the
// VCDN service. Documentation should include thorough system overview, configuration information, and API usage
// examples.

// @TODO - Develop user account registration/authorization system
// User accounts are integral to any SaaS. VCDN needs to verify only authorized/account holding users can access the
// VCDN service. In addition VCDN user accounts are directly integrated and associated with the domains registered with
// them as well as the shared assets that are registered within a given domain.

// @TODO - Develop methodology for running checksums on shared assets
// After a user is registered, a cron task downloads all shared assets, calculating a checksum for each one. Each
// checksum is then stored in a database associating itself with the file it represents. On each "registration" (or page
// load) from ANY client a check is performed to make sure all shared files are up to date. New checksums are calculated
// for new shared assets and assets that are no longer shared are removed.


// Define environment variables
var _                   = require('lodash'),
    io                  = require('socket.io'),
    fs                  = require('fs'),
    ee                  = require('events').EventEmitter,
    express             = require('express'),
    satelize            = require('satelize'),
    path                = require('path'),
    port                = 9222,
    app                 = express(),
    server              = null,
    hosts               = {},
    vapor               = (function(v) {


      /**
       * Register a host
       */
      v.register = function(msg, socket) {

        // Register host - not yet available for hosting
        if (!msg.ready && !(socket.id in hosts)) {
          hosts[socket.id] = {
            socket: socket,
            id: socket.id,
            ready: msg.ready,
            //coords: v.getIPCoords(socket.address),
            //coords: v.getIPCoords(_.size(hosts)),
            init: null
          };

          // Build and send the init object to registered client
          hosts[socket.id].init = {
            self: {
              id: socket.id,
              vcdn_time: Date.now()
              //coords: hosts[socket.id].coords
            },

            // Return list of hosts sorted by ascending distance
            //hosts: v.getClosestHostsList(hosts[socket.id].coords, v.getPeerHosts(msg, socket))
            hosts: v.getPeerHosts(msg, socket)
          };

          // Send ready message back to host
          socket.emit('ready', hosts[socket.id].init);
        }

        // Register host as ready
        else if (msg.ready && (socket.id in hosts)) {
          hosts[socket.id].ready = true;
          hosts[socket.id].assets = msg.assets;
          hosts[socket.id].diff_time = msg.diff_time;
        }
      };

      /**
       * De-register a host
       */
      v.deregister = function(socket_id) {
        delete hosts[socket_id];
      };

      /**
       * Get a list of available peer hosts
       */
      v.getPeerHosts = function(msg, socket) {
        var limit = 0;
        var ready_hosts = [];
        _.each(hosts, function(host) {
          if (limit < msg.limit && host.ready && host.id != socket.id) {
            ready_hosts.push({
              id: host.id,
              stamp: host.stamp,
              assets: host.assets,
              diff_time: host.diff_time
              //coords: host.coords

            });
            limit++;
          } else {
            return false;
          }
        });

        return ready_hosts;
      };

      /**
       * Retrieve the likely coordinates of an IP address.
       * @param ip {String} An IP address
       * @returns {Array} Latitude and Longitude in an array
       */
      v.getIPCoords = function( ip ) {

        // @TODO - Remove - For purposes of DEV create fake IP locations
        var ips = {
          0: '208.74.128.1',      // Oregon 1
          1: '12.157.243.0',      // Oregon 2
          2: '69.174.252.4',      // Texas,
          3: '72.229.28.185'      // New York
        };

        // @TODO - Remove - For purposes of DEV create test coordinates based on above IPs
        var coords = {
          0: {lon: '-123.3983', lat: '42.3794'},
          1: {lon: '-123.3478', lat: '42.5386'},
          2: {lon: '-98.3987', lat: '29.4889'},
          3: {lon: '-73.9885', lat: '40.7317'}
        };

        // Look up coordinate info based on IP
        // @TODO - Implement VCDN geolocation DB so no third party connection is needed
        //satelize.satelize({ip: ips['3']}, function(err, geoData) {
        //
        //  // if data is JSON, we may wrap it in js object
        //  var obj = JSON.parse(geoData);
        //  console.log('ip data', obj);
        //});

        return coords[ip];
      };

      /**
       * Calculate the distance between two sets of coordinates.
       */
      v.getCoordDistance = function( lat1, lon1, lat2, lon2 ) {
        var
          deg2rad = function( deg ) {
            return deg * (Math.PI/180);
          },
          R       = 6371,
          dLat    = deg2rad(lat2-lat1),
          dLon    = deg2rad(lon2-lon1),
          a       =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2),
          c       = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)),
          d       = R * c;
        return d;
      };

      /**
       * Returns hosts sorted by distance
       */
      v.getClosestHostsList = function( self, hosts ) {
        var distances = [];

        // Iterate over each hosts, calculating distance from self
        _.each(hosts, function( host, host_index ) {
          var
            lat1    = parseFloat(self.lat),
            lon1    = parseFloat(self.lon),
            lat2    = parseFloat(host.coords.lat),
            lon2    = parseFloat(host.coords.lon);
          distances.push({
            host: host,
            distance: v.getCoordDistance(lat1, lon1, lat2, lon2)
          });
        });

        // Sort hosts back into an array by distance
        var sorted_hosts = _.pluck(_.sortBy(distances, 'distance'), 'host');
        return sorted_hosts;
      };

      return v;
    }(vapor || {}));

/**
 * Server config
 */

// Instruct express to serve up static assets
//app.use(express.static('/'));
app.use(express.static('public'));

// Trust X-Forwarded-* header fields
app.enable('trust proxy');

/**
 * Define socket listeners
 */

// Initialize server & socket.io
server = app.listen(port);
io = io.listen(server, {log: false});

// Connection handlers
io.sockets.on('connection', function(socket) {

  /**
   * Listen on request to register a client.
   */
  socket.on('register', function(msg) {
    vapor.register(msg, socket);
  });

  /**
   * Listen on request to deregister client.
   */
  socket.on('disconnect', function() {
    vapor.deregister(socket.id);
  });

  /**
   * Listen on request to send data message to target peer.
   *
   * @param messageObject
   * @param messageObject.host_id Socket ID of target host to send message to
   * @param messageObject.handler Handler ID of target host to receive message
   */
  socket.on('P2PC_SendMessageToPeer', function(messageObject) {
    var target_peer = null,
        handler = messageObject.handler;

    // When peer host is still connected
    if (messageObject.peer_id in hosts) {
      target_peer = hosts[messageObject.peer_id].socket;
      target_peer.emit(handler, messageObject);
    }

    else {
      // @TODO - Develop error handling message to client when a target peer becomes unavailable.
      // socket.emit(handler, {});
    }
  });

  /**
   * Listen on request to send client SDP offer to target peer.
   *
   * @param offerObject
   * @param offerObject.target_peer_host_id
   * @param offerObject.offer
   */
  socket.on('P2PC_SendOfferToPeerHost', function(offerObject) {
    var target_peer_host = null;

    // Attempt to address the target peer host and send offer
    if (offerObject.target_peer_host_id in hosts) {
      target_peer_host = hosts[offerObject.target_peer_host_id].socket;
      target_peer_host.emit('P2PC_SendOfferToPeerHost', {
        id: offerObject.target_peer_host_id,
        from: socket.id,
        offer: offerObject.offer
      });
    }

    else {
      // @TODO Develop error handling message to peer when a client peer becomes unavailable.
      // socket.emit(handler, {});
    }
  });

  /**
   * Listen on request to send SDP answer to target peer.
   *
   * @param answerObject
   * @param answerObject.target_peer_host_id
   * @param answerObject.answer
   */
  socket.on('P2PC_SendAnswerToPeerHost', function(answerObject) {
    var target_peer_host = null;

    // Attempt to address the target peer host and send answer
    if (answerObject.target_peer_host_id in hosts) {
      target_peer_host = hosts[answerObject.target_peer_host_id].socket;
      target_peer_host.emit('P2PC_SendAnswerToPeerHost', {
        id: answerObject.target_peer_host_id,
        from: socket.id,
        answer: answerObject.answer
      });
    }

    else {
      // @TODO Develop error handling message to client when a target peer becomes unavailable.
      //socket.emit(handler, {});
    }
  });

});
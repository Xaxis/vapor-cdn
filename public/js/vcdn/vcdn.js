(function() {

  // App dependencies
  var deps = [
    'lib/global/global.js',
    'lib/util/util.js',
    'lib/log/log.js',
    'lib/cache/cache.js',
    'lib/serve/serve.js',
    'lib/p2ps/p2ps.js',
    'lib/p2pc/p2pc.js',
    'app/main.js'
  ];

  // Retrieve the baseUrl
  var baseUrlElm = document.currentScript;
  var baseUrl = baseUrlElm.getAttribute('data-vcdn-base') + '/';
  var load = true;

  // Load socket.io separately from dependencies
  document.write('<script src="/socket.io/socket.io.js/"></script>');

  // Load dependencies
  for (var i = 0; i < deps.length; i++) {
    var url = deps[i];
    document.write('<script src="' + baseUrl + url + '"></script>');
  }
}());
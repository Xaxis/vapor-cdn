(function() {

  // App dependencies
  var deps = [
    '/socket.io/socket.io.js',
    'lib/util/util.js',
    'lib/global/global.js',
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

  // Load app dependencies
  deps.forEach(function(url, index) {
    url = index != 0 ? baseUrl + url : url;
    document.write('<script src="' + url + '"></script>');
  });
}());
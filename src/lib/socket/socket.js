var vcdn = (function(v, global) {

  // Load socket.io separately from dependencies
  document.write('<script src="/socket.io/socket.io.js/"></script>');

  return v;
}(vcdn || {}, window));
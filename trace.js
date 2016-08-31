var stackTrace = require('stack-trace')
var net = require('net')
var fs = require('fs')
var socket = net.connect({
	port: process.env.BLOCK_TRACE_PORT
})
var interval = setInterval(ping, 500)
ping()
interval.unref()
socket.unref()

function ping () {
  socket.write('ping\n')
}

global.WRITE_BLOCK_TRACE_FILE = function () {
  var stack = stackTrace.parse(new Error());
  var string = "";
  for (var s in stack) {
  	string += JSON.stringify(stack[s]) + "\n"
  }
  fs.writeFileSync(process.env.BLOCK_TRACE_FILE, string, 'utf8');
  process.exit(1);
}

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

global.WRITE_BLOCK_TRACE_FILE = function WRITE_BLOCK_TRACE_FILE() {
  fs.writeFileSync(process.env.BLOCK_TRACE_FILE, new Error().stack.toString(), 'utf8')
  process.exit(1)
}

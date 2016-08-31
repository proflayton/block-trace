#!/usr/bin/env node

var net = require('net')
var which = require('which')
var proc = require('child_process')
var fs = require('fs')
var path = require('path')
var os = require('os')

var tempName = null;
var child = null
var debug = null
var tracing = false

if (process.argv.length < 3) {
  console.error('Usage: block-trace [node-program] [arguments...]')
  process.exit(1)
}

if (process.argv[2] === 'node' || process.argv[2] === 'nodejs') run(process.argv.slice(3))
else whichAndRun(process.argv.slice(2))

function whichAndRun (args) {
  which(args[0], function (err, cmd) {
    if (err) return onerror(err)
    run([cmd].concat(args.slice(1)))
  })
}

function run (args) {
  args.unshift('--debug')

  var server = unref(net.createServer(onsocket))
  var timeout = unref(setTimeout(ontimeout, 1000))

  server.listen(0, onlistening)

  function onlistening () {
    process.env.BLOCK_TRACE_PORT = '' + server.address().port
    process.env.BLOCK_TRACE_FILE = path.join(os.tmpDir(), 'block-trace-' + server.address().port)

    var moduleIndex = 1;
    for (; moduleIndex < args.length; ++moduleIndex) {
      if (fs.existsSync(path.join(__dirname, args[moduleIndex]))) {
        break;
      }
    }
    if (moduleIndex === args.length) {
      // Sad face. Bad cmd
      console.error("Misconfigured args, couldn't find module to run", args);
      return;
    }
    var moduleToRun = args[moduleIndex]
    tempName = "tmp_" + moduleToRun

    var exists = fs.existsSync(path.join(__dirname, tempName))
    if (exists) {
      // Remove this temp file if it already exists
      // (A previous block-trace process failed to cleanup somewhere?)
      fs.unlinkSync(path.join(__dirname, tempName))
    }
    var fileData = fs.readFileSync(path.join(__dirname, moduleToRun))
    // Append the `trace` require to the top
    fs.writeFileSync(
      path.join(__dirname, tempName),
      "require('" + require.resolve('./trace.js') + "');\n" + fileData,
      {
        flags: 'w'
      }
    )
    // Now we actually want to run our awesome hacked-together module
    args[moduleIndex] = tempName

    child = proc.spawn(process.execPath, args, {
      stdio: [process.stdin, process.stdout, null]
    })
    child.on('exit', cleanup)

    child.stderr.once('data', function (line) {
      if (!/^Debugger listening on port \d+$/.test(line.toString().trim())) process.stderr.write(line)
      child.stderr.pipe(process.stderr)
    })
  }

  function onsocket (socket) {
    clearTimeout(timeout)
    unref(socket)
    socket.setTimeout(1000, ontimeout)
    socket.on('timeout', destroy)
    socket.on('error', destroy)
    socket.resume()
  }
}

function destroy () {
  this.destroy()
}

function ontimeout () {
  if (!child) return
  tracing = true
  debug = proc.spawn(process.execPath, ['debug', 'localhost:5858'])

  function _checkData(data) {
    if (data.toString().indexOf("ok") !== -1) {
      setImmediate(_write)
    } else {
      _listenForOk()
    }
  }
  function _listenForOk() {
    debug.stdout.once('data', _checkData)
  }
  function _write() {
    debug.stdin.write('repl\nWRITE_BLOCK_TRACE_FILE()\n')
  }

  _listenForOk()
  debug.on('exit', cleanup)
}

function cleanup () {
  if (child) child.kill()
  if (debug) debug.kill()
  if (tempName) {
    var exists = fs.existsSync(path.join(__dirname, tempName))
    if (exists) {
      fs.unlinkSync(path.join(__dirname, tempName))
    }
  }

  if (!tracing) return
  tracing = false

  try {
    var stack = fs.readFileSync(process.env.BLOCK_TRACE_FILE, 'utf-8')
  } catch (err) {
    return
  }
  // Trim off the top 3 which will be added due to our invasive maneuvers
  stack = 'Error: CPU is blocked\n' + stack.trim().split('\n').slice(3).join('\n')
  console.error(stack)
  process.exit(1)
}

process.once('SIGINT', kill('SIGINT'))
process.once('SIGTERM', kill('SIGTERM'))

function kill (sig) {
  return function () {
    tracing = false
    cleanup()
    process.kill(process.pid, sig)
  }
}

function onerror (err) {
  cleanup()
  throw err
}

function unref (obj) {
  if (obj.unref) obj.unref()
  return obj
}

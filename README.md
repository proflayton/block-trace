# block-trace

Figure out if your node process is blocked because the CPU is spinning and exit the program with a stack trace if that is the case.

Useful for debugging unresponsive servers.

```
npm install -g block-trace
```

## Usage

Giving the following example program

``` js
console.log('Waiting 1s ...')

setTimeout(function () {
  console.log('Spinning the CPU now!')
  while (1) {}
}, 1000)
```

If you run this with `block-trace` by doing the following

``` sh
block-trace node example.js
```

After 1s the program will exit with the following output

```
Waiting 1s ...
Spinning the CPU now!
Error: CPU is blocked
    at /Users/maf/dev/node_modules/block-trace/example.js:5:10
    at Timer.listOnTimeout (timers.js:92:15)
```

### Stack Trace Size

You control the stack trace size by providing a stack-trace-limit option. This is actually handled by Node itself.
Example:
```
--stack-trace-limit=50
```

## Assumptions

Currently, `block-trace` is designed in such a manner that we assume the LAST arg in your command is your module (block-trace node example.js <<< example.js). This is to provide compatability with node v0.10.x.

## License

MIT

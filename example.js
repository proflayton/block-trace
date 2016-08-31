console.log('Waiting 1s ...')

// Want to do some recursion to make the stack more of an actual thing
function iAmRecursive() {
	var i = 0;
	while (++i < 1000000) {}
	iAmRecursive();
}

setTimeout(function timeout() {
  console.log('Spinning the CPU now!')
  iAmRecursive();
}, 1000)

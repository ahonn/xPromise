'use strict'
var asap = require('asap/raw')

// Promise state
var PENDING = 'pending',
    FULFILLED = 'fulfilled',
    REJECTED = 'rejected'

var noop = function () {}

function createResolveFunctions(promise) {
  var alreadyResolved = false

  var resolve = function (resolution) {
    if (alreadyResolved) return
    alreadyResolved = true
    resolvePromise(promise, resolution)
  }

  var reject = function (reason) {
    if (alreadyResolved) return
    alreadyResolved = true
    rejectPromise(promise, reason)
  }

  return {
    resolve: resolve,
    reject: reject,
  }
}


function resolvePromise(promise, resolution) {
  if (resolution === promise) {
    rejectPromise(promise, new TypeError)
    return
  }

  var t = typeof resolution
  if (resolution && (t === 'object' || t === 'function')) {
    var then
    try {
      then = resolution.then
    } catch (e) {
      rejectPromise(promise, new TypeError)
      return
    }

    if (then && typeof then === 'function') {
      var resolveFunctions = createResolveFunctions(promise),
          resolve = resolveFunctions.resolve,
          reject = resolveFunctions.reject
      try {
        then.call(resolution, resolve, reject)
      } catch (e) {
        resolveFunctions.reject(e)
      }
      return
    }
  }

  fulfillPromise(promise, resolution)
  return
}

function rejectPromise(promise, reason) {
  promise._state = REJECTED
  promise._result = reason

  for (var i = 0; i < promise._jobs.length; ++i) {
    handlePromise(promise, promise._jobs[i])
  }
}


function fulfillPromise(promise, value) {
  promise._state = FULFILLED
  promise._result = value

  for (var i = 0; i < promise._jobs.length; ++i) {
    handlePromise(promise, promise._jobs[i])
  }
}


function handlePromise(promise, job) {
  if (promise._state === PENDING) {
    promise._jobs.push(job)
    return
  }
  asap(function () {
    var cb = promise._state === FULFILLED ? job.onFulfilled : job.onRejected
    if (cb === null) {
      if (promise._state === FULFILLED) {
        resolvePromise(job.promise, promise._result)
      } else {
        rejectPromise(job.promise, promise._result)
      }
      return
    }

    var res
    try {
      res = cb(promise._result)
    } catch (e) {
      rejectPromise(job.promise, new TypeError(e))
    } finally {
      resolvePromise(job.promise, res)
    }
  })
}


function Promise(exector) {
  if (!(this instanceof Promise)) throw new TypeError
  if (typeof exector !== 'function') throw new TypeError

  this._state = PENDING
  this._result = null
  this._jobs = []

  var resolveFunctions = createResolveFunctions(this),
      resolve = resolveFunctions.resolve,
      reject = resolveFunctions.reject

  try {
    exector(resolve, reject)
  } catch (e) {
    resolveFunctions.reject(e)
  }
}

Promise.prototype.then = function (onFulfilled, onRejected) {
  if (!(this instanceof Promise)) throw new TypeError

  var promise = this
  var newPromise = new Promise(noop)
  var job = new PromiseJob(onFulfilled, onRejected, newPromise)
  handlePromise(promise, job)

  return newPromise
}

function PromiseJob(onFulfilled, onRejected, promise) {
  var f = onFulfilled,
      r = onRejected
  this.onFulfilled = typeof f === 'function' ? f : null
  this.onRejected = typeof r === 'function' ? r : null
  this.promise = promise
}

exports.defalut = Promise

// Test
// function asyncFunction() {
    // return new Promise(function (resolve, reject) {
        // console.log(1)
        // setTimeout(function () {
            // resolve('2');
        // }, 1000);
    // });
// }
// asyncFunction().then(function (v) {
  // console.log(v)
// })



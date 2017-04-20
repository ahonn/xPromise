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
      rejectPromise(promise, e)
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

  triggerPromiseThen(promise)
}


function fulfillPromise(promise, value) {
  promise._state = FULFILLED
  promise._result = value

  triggerPromiseThen(promise)
}


function triggerPromiseThen(promise) {
  var currentJob = promise._jobs.shift()
  if (!currentJob) return

  handlePromise(promise, currentJob)
  triggerPromiseThen(promise)
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

    try {
      var res = cb(promise._result)
    } catch (e) {
      rejectPromise(job.promise, e)
      return
    }
    resolvePromise(job.promise, res)
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

Promise.resolve = function (value) {
  return new Promise(function (resolve) {
    resolve(value)
  })
}

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) {
    reject(value)
  })
}

Promise.prototype.then = function (onFulfilled, onRejected) {
  if (!(this instanceof Promise)) throw new TypeError

  var promise = this
  var C = promise.constructor
  if (C !== Promise) {
    return new C(function (resolve, reject) {
      var newPromise = new Promise(noop)
      newPromise.then(resolve, reject)
      var job = new PromiseJob(onFulfilled, onRejected, newPromise)
      handlePromise(promise, job)
    })
  }

  var newPromise = new Promise(noop)
  var job = new PromiseJob(onFulfilled, onRejected, newPromise)
  handlePromise(promise, job)

  return newPromise
}

Promise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected)
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
function asyncFunction() {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            reject(2)
            resolve(1)
        }, 1000);
    });
}
console.log(asyncFunction())
asyncFunction().then(function (v) {
  console.log(v)
}).catch(function (err) {
  console.log(err)
})


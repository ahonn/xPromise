'use strict'

var noop = function () {}

// Promise state
var PENDING = 'pending',
    FULFILLED = 'fulfilled',
    REJECTED = 'rejected'

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
    rejectPromise(promise, reject)
  }

  return {
    resolve: resolve,
    reject: reject,
  }
}


function resolvePromise(promise, resolution) {
}


function rejectPromise(promise, reason) {
}


var xPromise = function (exector) {
  if (!(this instanceof xPromise)) throw new TypeError
  if (typeof exector !== 'function') throw new TypeError

  this._state = PENDING
  this._result = null

  var resolveFunctions = createResolveFunctions(this)
  try {
    exector(resolveFunctions.resolve, resolveFunctions.reject)
  } catch (e) {
    resolveFunctions.reject(e)
  }
}

SimplePromise.prototype.then = function (onFulfilled, onRejected) {
  onFulfilled()
}

exports.defalut = xPromise

// Test
var p = new SimplePromise(function (resolve, reject) {})

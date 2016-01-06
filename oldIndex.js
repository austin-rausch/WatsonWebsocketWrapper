var request = require('request')
var WebSocket = require('ws')
var fs = require('fs')
var url = require('url')
var path = require('path')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

inherits(watsonWSSTTwrapper, EventEmitter)

var watsonTokenURL = 'https://stream.watsonplatform.net/authorization/api/v1/token?url=https://stream.watsonplatform.net/speech-to-text/api'
var watsonWebSocketURLbase = 'wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?watson-token='
/*
@param options = {sttCreds : {username : STRING, password: STRING}, sampleRate: INTEGER}
*/
function watsonWSSTTwrapper (options) {
  if (!options || !options.sttCreds || !options.sttCreds.username || !options.sttCreds.password) {
    throw new Error('ERROR: must provide username and password for watson')
  }
  var self = this
  EventEmitter.call(self)
  //self.setMaxListeners(0)
  self._options = options
  self.tokenTimeStamp = null  //timestamp for the token
  self.token = null //token returned from watson authorization
  self.active = false //is the socket currently active
  self.wSocket = null //web socket connection
 // self.verbose = options.verbose  //enable verbose output or not
  self.sampleRate = options.sampleRate
  self.socketAttempts = 0
  self._checkToken()
}

watsonWSSTTwrapper.prototype.start = function (stream) {
  var self = this
  if (stream) {
    self.addStream(stream)
  }
}

watsonWSSTTwrapper.prototype.addStream = function (stream) {
  var self = this
  if (!self.active) {
    console.log('not active, returning')
    return
  }
  stream.on('data', function (chunck) {
    self.wSocket.send(chunck, {binary: true})
  })
}

watsonWSSTTwrapper.prototype.close = function () {
  var self = this
  self.emit('close')
  self.wSocket.send('{"action" : "stop"}')
  self.active = false
}

watsonWSSTTwrapper.prototype._checkToken = function (cb) {
  var self = this
  console.log(self instanceof watsonWSSTTwrapper)
  var currentTime = new Date().getHours()  //tokens expire after an hour, compare self with current time to decide if to update
  if (self.tokenTimeStamp === null || (self.tokenTimeStamp != currentTime)) {
    self.tokenTimeStamp = currentTime
    //console.log(self._options)
    var credentials = 'Basic ' + new Buffer(self._options.sttCreds.username + ':' + self._options.sttCreds.password).toString('base64')
    //console.log('got here')
    var reqOptions = {
      url: watsonTokenURL,
      headers: {
        'Authorization' : credentials
      }
    }
    request(reqOptions, requestCallback)
  }
  function requestCallback (err, res, body) {
    if (!err && res.statusCode === 200) {
      self.token = body
      initSocket()
    }
    else if (res.statusCode !== 200) {
      throw new Error('ERROR: request for token from watson failed, are your credentials correct?')
    }
    else {
      throw err
    }
  }
  function initSocket () {
    self.wSocket = new WebSocket(watsonWebSocketURLbase + self.token)
    self.wSocket.on('open', function () {
      self.socketAttempts = 0
      var message = {'action': 'start', 'content-type': 'audio/l16;rate=' + self._options.sampleRate, 'interim_results' : true}
      self.active = true
      self.emit('open')
      self.wSocket.send(JSON.stringify(message))
      if (cb) cb()
    })
    self.wSocket.on('error', function (err) {
      if (self.socketAttempts > 5) {
        throw new Error('cannot communicate with watson server')
        return
      }
      self.socketAttempts++
      self._checkToken()
      return
    })
    self.wSocket.on('message', function (message) {
      var jsonMessage = JSON.parse(message)
      if (jsonMessage.error) {
        self.active = false
        self.wSocket = null
        self.emit('timeout')
      } else if (!jsonMessage.state && jsonMessage.results[0].final){
        self.emit('final' , message)
      } else {
        self.emit('message', message)
      }
    })
  }
}
module.exports = watsonWSSTTwrapper

var request = require('request')
var WebSocket = require('ws')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

inherits(watsonSTTWSwrapper, EventEmitter)

var watsonTokenEndpoint = 'https://stream.watsonplatform.net/authorization/api/v1/token?url=https://stream.watsonplatform.net/speech-to-text/api'
var watsonWSEndpointBase = 'wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?watson-token='

/*
options = {username: 'STT USERNAME', password: 'STT PASSWORD', sampleRate: INTEGER, type = 'STRING FOR CONTENT-TYPE'}
DEFAULTS:
	samplerate: 16000
	type = 'audio/l16'
*/

function watsonSTTWSwrapper (options) {
	if (!options) {
		throw new Error('Must provide options')
	}
	if (!options.username || !options.password) {
		throw new Error('Must provide STT username & password')
	}
	options.sampleRate = options.sampleRate || 16000
	options.contType = options.contType || 'audio/l16'
	var self = this
	EventEmitter.call(self)
	self.active = false
	self.ready = false
	self._destroyed = false
	self._wSocket = null
	self._currentStream = null
	self._token = ''
	self._options = options
	self._keepAlive = null
	try {
			self._init()
	} catch (err) {
		throw err
	}

}

watsonSTTWSwrapper.prototype.start = function (stream) {
	var self = this
	if (self._destroyed) {
		throw new Error('destroyed')
	} else if (!self.ready) {
		return
	} else if (!stream) {
		return
	}
	var message = {'action': 'start', 'content-type':  self._options.contType  + ';rate=' + self._options.sampleRate, 'interim_results' : true, 'continuous': true}
	self._wSocket.send(JSON.stringify(message))
	self.active = true
	self.emit('started')
	stream.on('data', function (chunck) {
		if(self._wSocket) {
			self._wSocket.send(chunck, {binary:true})
		}
	})
	stream.on('end', function () {
		self.active = false
		if(self._wSocket) {
			self._wSocket.send('{"action" : "stop"}')
		}
		self.emit('stopped')
	})
}

watsonSTTWSwrapper.prototype.stop = function () {
	var self = this
	if (self._destroyed) {
		throw new Error('destroyed')
	} else if (!self.active) {
		return
	}
	self.active = false
	self._currentStream.pause()
	self._currentStream = null
	self.emit('stopped')
}

watsonSTTWSwrapper.prototype.destroy = function () {
	var self = this
	if (self._destroyed) {
		throw new Error('client already destroyed')
	}
	clearInterval(self._keepAlive)
	if(self._wSocket) {
		self._wSocket.close()
	}
	self._wSocket = null
	self.active = false
	self.ready = false
	self._destroyed = true
	self.emit('destroyed')
}

watsonSTTWSwrapper.prototype._init = function () {
	var self = this
	try {
		getToken()
	} catch (err) {
		throw err
	}
	function getToken() {
		var credentials = 'Basic ' + new Buffer(self._options.username + ':' + self._options.password).toString('base64')
		var reqOptions = {
    	url: watsonTokenEndpoint,
    	headers: {
    		'Authorization' : credentials
    	}
    }
		request(reqOptions, requestCB)
		function requestCB (err, res, body) {
			if (!err && res.statusCode === 200) {
      	self._token = body
      	initSocket()
   		} else {
				self.destroy()
			}
		}
	}
	function initSocket() {
		self._wSocket = new WebSocket(watsonWSEndpointBase + self._token)
		self._wSocket.on('error', function (err) {
			throw err
		})
		self._wSocket.on('open', function () {
			self.ready = true
			self.emit('ready')
			self._keepAlive = setInterval(function (socket) {
				if (socket._destroyed) {
					return
				}
				socket._wSocket.send('{"action" : "no-op"}')
				socket.emit('keepAlive')
			},
			1000 * 4,
			self
			)
		})
		self._wSocket.on('message', function (message) {
			var jsonMessage = JSON.parse(message)
			if (jsonMessage.error) {
				self.active = false
				self.wSocket = null
				self.emit('err', message)
			} else if (!jsonMessage.state && jsonMessage.results[0].final) {
				self.emit('final', message)
			} else if (!jsonMessage.state){
				self.emit('message', message)
			}
			else {
				self.emit('listening')
			}
		})
	}
}
module.exports = watsonSTTWSwrapper

var watsonWebSocket = require('../')
var chai = require('chai')
chai.config.includeStack = true
require('chai').should()
var expect = require('chai').expect
var fs = require('fs')
var config = require('./config')
var path = require('path')
var transcriptResult = 'thunderstorms could produce large hail isolated tornadoes and heave rain '
describe('Watson Web Socket', function () {
  this.timeout(0)

  describe('read stream test', function () {
    it('should take a read stream', function (done) {
      var messageCnt = 0
      var final = {}
      var options = {
        username : config.STT_CREDENTIALS.username,
        password : config.STT_CREDENTIALS.password,
        sampleRate : 44100,
        contType: 'audio/l16'
      }
      var socket = new watsonWebSocket(options)
      var resourcePath = path.join(__dirname, './resources/speech.wav')
      socket.on('message', function (message) {
        messageCnt++
      })
      socket.on('final', function (message) {
        expect(++messageCnt).to.equal(7)
        final = JSON.parse(message)
        expect(final.results[0].final).to.equal(true)
        expect(final.results[0].alternatives[0].confidence).to.equal(0.9994227886199951)
        expect(final.results[0].alternatives[0].transcript.length).to.equal(transcriptResult.length)
        socket.destroy()
      })
      socket.on('ready', function () {
        socket.start(fs.createReadStream(resourcePath))
      })
      socket.on('destroyed', function () {
        done()
      })
    })
  })
  describe('pausing during read stream should not close socket', function () {
    var listeningCount = 0
    var readCount = 0
    var finalCount = 0
    it('should should stay open with occassionaly pauses', function (done) {
      var options = {
        username : config.STT_CREDENTIALS.username,
        password : config.STT_CREDENTIALS.password,
        sampleRate : 44100,
        contType: 'audio/l16'
      }
      var socket = new watsonWebSocket(options)
      var resourcePath = path.join(__dirname, './resources/speech.wav')
      var readStream = fs.createReadStream(resourcePath)

      socket.on('message', function (message) {
        //console.log(message)
      })
      socket.on('final', function (message) {
        if (++finalCount === 5) {
		socket.destroy()
	}
      })
      socket.on('ready', function () {
        socket.start(readStream)
	readStream.on('data', function (c) {

		if(++readCount%5 === 0) {
			readStream.pause()
			setTimeout(function () {
				readStream.resume()
			}, 7000)
		}
	})
      })
      socket.on('listening', function () {

      })
      socket.on('destroyed', function () {
        done()
      })
    })
  })
  describe('failure testing', function () {
    it('should fail with no options', function (done) {
      try {
        var socket = new watsonWebSocket()
      } catch (err) {
        done()
      }
    })
    it('should destroy the socket with invalid credentials', function (done) {
      var options = {
        username : 'foo',
        password : 'bar',
        sampleRate : 44100,
        contType: 'audio/l16'
      }
      var socket = new watsonWebSocket(options)
      socket.on('destroyed', function () {
        done()
      })
    })
  })
  describe('post destroy test', function () {
    it('should throw error on all functions when envoked after destruction', function (done) {
      var errCnt = 0
      var options = {
        username : config.STT_CREDENTIALS.username,
        password : config.STT_CREDENTIALS.password,
        sampleRate : 44100,
        contType: 'audio/l16'
      }
      var socket = new watsonWebSocket(options)
      var resourcePath = path.join(__dirname, './resources/speech.wav')
      socket.on('ready', function () {
        socket.destroy()
      })
      socket.on('destroyed', function () {
        try {
          socket.start(fs.createReadStream(resourcePath))
        } catch (err) {
          errCnt++
        }
        try {
          socket.stop()
        } catch (err) {
          errCnt++
        }
        try {
          socket.destroy()
        } catch (err) {
          errCnt++
        }
        expect(errCnt).to.equal(3)
        done()
      })
    })
  })
  describe('wait testing', function () {
    it('should stay open after the stream closes', function (done) {
      var options = {
        username : config.STT_CREDENTIALS.username,
        password : config.STT_CREDENTIALS.password,
        sampleRate : 44100,
        contType: 'audio/l16'
      }
      var socket = new watsonWebSocket(options)
      var resourcePath = path.join(__dirname, './resources/speech.wav')
      socket.on('ready', function () {
        socket.start(fs.createReadStream(resourcePath))
      })
      socket.on('keepAlive', function () {
        socket.destroy()
      })
      socket.on('destroyed', function () {
        done()
      })
    })
  })
})

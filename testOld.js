var watsonWebSocket = require('../')
var chai = require('chai')
chai.config.includeStack = true
require('chai').should()
var expect = require('chai').expect
var fs = require('fs')
var config = require('./config')
var path = require('path')

describe('Watson Web Socket', function () {
  this.timeout(30000)
  var options = {
    sttCreds : config.STT_CREDENTIALS,
    sampleRate : 44100
  }
  var STTsocket = new watsonWebSocket(options)
  var resourcePath = path.join(__dirname, './resources/speech.wav')

  describe('test stream', function () {
    it('should take a read stream', function (done) {
      STTsocket.on('message', function (message) {
        console.log(message)
      })
      STTsocket.on('final', function (message) {
        console.log('final')
        console.log(message)
        STTsocket.close()
        done()
      })
      STTsocket.on('open', function() {
          console.log('open')
          STTsocket.start(fs.createReadStream(resourcePath))
      })
    })
  })
  
})

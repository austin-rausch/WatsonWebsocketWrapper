var request = require('request')
var WebSocket = require('ws')
var fs = require('fs')
var config = require('./config')
var url = require('url')
var path = require('path')
var EventEmitter = require('events').EventEmitter
var x = true
var wsURI = ''

var watsonWebSocket = null

var watsonTokenURL = 'https://stream.watsonplatform.net/authorization/api/v1/token?url=https://stream.watsonplatform.net/speech-to-text/api'

var credentials = "Basic " + new Buffer(config.STT_CREDENTIALS.username + ':' + config.STT_CREDENTIALS.password).toString('base64')

var enabled = false

var reqOptions = {
  url: watsonTokenURL,
  headers: {
    'Authorization' : credentials
  }
}

var resourcePath = path.join(__dirname, './test/resources/speech3.wav');


function requestCallback (err, res, body) {
  if (!err && res.statusCode === 200) {
      //console.log(body)
      if (x) {
        x = !x
        wsURI = "wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?watson-token=" + 'garbage'
      } else {
        wsURI = "wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?watson-token=" + body //+ "&model=en-US_BroadbandModel"
      }
      watsonWebSocket = new WebSocket(wsURI)
      watsonWebSocket.on('error', function (err) {
        request(reqOptions, requestCallback)
        return
      })
      watsonWebSocket.on('open', function () {
        watsonWebSocket.send('{"action": "start", "content-type": "audio/wav; rate=441000", "interim_results" : true, "continuous" : true}')
        enabled = true
        var speechAudioStream = fs.createReadStream(resourcePath);
        speechAudioStream.on('data', function(chunck) {
          watsonWebSocket.send(chunck, {binary: true})
          console.log('<send audio chunck>')
        })
        speechAudioStream.on('end', endSocket)
      })
      watsonWebSocket.on('message', function (smessage) {
        var message = JSON.parse(smessage)
        console.log(smessage)
      })
  } else if (err) {
    console.log(err)
  } else {
    console.log(res.statusCode)
  }
}

function endSocket () {
  if (watsonWebSocket) {
    enabled = false
    watsonWebSocket.send('{"action" : "stop"}')
  }
}

request(reqOptions, requestCallback)

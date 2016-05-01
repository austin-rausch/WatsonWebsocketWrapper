'use strict';

const request = require('request');
const WebSocket = require('ws');
const EventEmitter = require('events').EventEmitter;
const inherits = require('util').inherits;
const extend = require('extend');

inherits(watsonWrapper, EventEmitter);

const WATSON_TOKEN_ENDPOINT = 'https://stream.watsonplatform.net/authorization/api/v1/token?url=https://stream.watsonplatform.net/speech-to-text/api';
const WATSON_WS_ENDPOINT_BASE = 'wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?watson-token=';

function watsonWrapper (options, username, password) {
    if (!username || !password) {
        throw new Error('Must provide username & password');
    }
    var defaultOptions = {
            'action' : 'start',
            'content-type' : 'audio/l16;rate=16000',
            'continuous' : true,
            'inactivity_timeout' : -1,
            'keywords' : [],
            'keywords_threshold' : null,
            'max_alternatives' : 1,
            'interim_results' : true,
            'word_alternatives_threshold' : null,
            'word_confidence' : false,
            'timestamps' : false,
            'profanity_filter' : true,
            'onMessage' : function () {},
            'onFinal' : function () {},
            'onError' : function () {}
    };
    options = extend(defaultOptions, options);
    var self = this;
    EventEmitter.call(self);
    self.ready = false;
    self.active = false;
    self.open = false;
    self._socket = null;
    self._options = options;
    self._token = null;
    self._keepAlive = null;
    self._getToken(username, password);
}

watsonWrapper.prototype.start = function () {
    var self = this;
    if (!self.ready) {
        process.nextTick(function () {
            self.start();
        });
    }
    var tmpOptions = self._options;
    delete tmpOptions.username;
    delete tmpOptions.password;
    var message = JSON.stringify(tmpOptions);
    if (!self.active) {
        self.active = true;
        self._socket = new WebSocket(WATSON_WS_ENDPOINT_BASE + self._token);
        self._socket.on('open', function () {
            self._socket.send(message);
            self.open = true;
            self.emit('open');
            self._keepAlive = setInterval(function (socket) {
                socket._socket.send('{"action" : "no-op"}', function (e) {
                    if (e) {
                        clearInterval(socket._keepAlive);
                    }
                });
                socket.emit('keepAlive');
            }, 1000 * 4, self);
        });
        self._socket.on('message', function (message) {
            var jsonMSG = JSON.parse(message);
            if (jsonMSG.error) {
                self._options.onMessage(message);
            } else if (!jsonMSG.state && jsonMSG.results[0].final) {
                self._options.onFinal(jsonMSG.results[0].alternatives[0].transcript);
            } else if (!jsonMSG.state) {
                self._options.onMessage(jsonMSG.results[0].alternatives[0].transcript);
            }
        });
        self._socket.on('close', function(){
            self.active = false;
            self.open = false;
            clearInterval(self._keepAlive);
            self.emit('closed');
        });
    }
};

watsonWrapper.prototype.sendBlob = function (blob) {
    var self = this;
    if (self.active && self.open){
        self._socket.send(blob, {binary:true});
    }
};

watsonWrapper.prototype.close = function () {
    var self = this;
    if (!self.active) {
        return;
    }
    self.active = false;
    self.open = false;
    clearInterval(self._keepAlive);
    self._socket.close();
    self.emit('close');
};

watsonWrapper.prototype._getToken = function (username, password) {
    var self = this;
    var credentials = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
    var reqOptions = {
        url: WATSON_TOKEN_ENDPOINT,
        headers: {
            'Authorization' : credentials
        }
    };
    request(reqOptions, function (err, res, body) {
        if(!err && res.statusCode === 200) {
            self._token = body;
            self.ready = true;
            self.emit('ready');
        } else {
            throw new Error('Failed to acquire token, invalid credentials?');
        }
    });

};

module.exports = watsonWrapper;

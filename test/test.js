const path = require('path');
//require('app-module-path').addPath(path.normalize(path.join(__dirname, '../')));
const chai = require('chai');
chai.config.includeStack = true;
//const should = chai.should();
//const expect = chai.expect;
const fs = require('fs');
const WatsonSocket = require('../index');
const config = require('./config');

describe(' watson socket test. ', function () {
    this.timeout(50000);
    describe(' - start, open and close test ', function () {
        it(' should emit open after started, and close after closed.', function (done) {
            var socket = new WatsonSocket({}, config.STT_CREDENTIALS.username, config.STT_CREDENTIALS.password);
            socket.on('close', function () {
                done();
            });
            socket.on('open', function () {
                socket.close();
            });
            socket.on('ready', function () {
                socket.start();
            });
        });
    });
    describe(' send blob test ', function () {
        it (' should receive messages when blobs are sent. ', function (done) {
            var timer;
            var socket = new WatsonSocket({
                onMessage: messageHandler,
                onFinal: messageHandler
            }, config.STT_CREDENTIALS.username, config.STT_CREDENTIALS.password);
            socket.on('close', function () {
                done();
            });
            socket.on('open', function () {
                readFile();
            });
            socket.on('ready', function () {
                socket.start();
            });
            function messageHandler (message) {
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(function () {socket.close()}, 10000);
            }
            function readFile () {
                var resourcePath = path.join(__dirname, './resources/speech.wav');
                var fileStream = fs.createReadStream(resourcePath);
                fileStream.on('data', function (data) {
                    socket.sendBlob(data);
                });
            }
        });
    });
});

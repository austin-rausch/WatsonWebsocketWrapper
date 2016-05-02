# **Watson Speech-to-Text websocket wrapper**

 **A wrapper for IBM Watson's speech to text service using websockets.**

# API

## socket = new WatsonWebsocketWrapper({opts}, username, password);

default opts:
```js
{
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
        'onMessage' : function (message) {},
        'onFinal' : function (message) {},
        'onError' : function (error) {}
};
```
The three options titled 'onMessage', 'onFinal' and 'onError' are where
behavior the the speech to text results should be added.

onMessage is used when 'interim_results' is true. The parameter 'message' is the
returned string.

onFinal is when a final result is sent back from the service. The parameter
'message' is the returned string.

Another thing to note, the optioned titled 'max_alternatives' should stay 1.
This module does not take advantage or alternatives, but instead just takes the
first result.

The username and password are acquired from IBM bluemix console.

## socket.start();

Sends the start message to the watson endpoint,
This should be called after the 'ready' event is fired,
'open' will be emitted after this method once blobs are ready to be sent.

## socket.sendBlob(blob);

Sends an audio chunk.  This should be in the format specified by 'content-type'
in the constructor opts.

## socket.close();

closes the underlying websocket connection, emits 'closed' when clean up is done


# Events

## .on('ready', function() {});

This is emitted after credentials are verified.
start() should be called after this.

## .on('open', function () {});

This is emitted after the underlying websocket connection has been opened.
After this event blobs can be sent.

## .on('close', function () {});

This is emitted after .close() has been called and
the connections have been cleaned up.

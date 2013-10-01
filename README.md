# Wigwam

A module for creating restful API servers and static file servers (with etags, caching, etc).

Web server is like a house, some are small and tiny, some are big and fancy. And if you're goin gto live there alone
or with small family of two-three people, you don't huge mansion with 10 rooms and 15 bathrooms,
it will take all your time to maintain teh thing with no clear advantage.
Same with the webservers, it's easy to install all-included frameworks like express,
but do you really need all of it's features all the time?


## Install

```
$ npm install wigwam
```

## Example

```
var server   = require('http').createServer()
  , path     = require('path')

  , Wigwam   = require('wigwam')

  , defaults =
    { port : 8500
    , path : 'static'
    }

  , serverOptions
  , staticPath
  ;

// make it absolute path
staticPath = path.join(__dirname, defaults.path);

// web server options
serverOptions =
{
  path      : staticPath,
  apiPath   : '/api/v1',
  websockets:
  {
    transformer  : 'socket.io',
    clientLibrary: path.join(staticPath, 'js/primus.js')
  }
};

// init webserver
wigwam = new Wigwam(server, serverOptions);

// [POST method] creates new hash for the provided url
wigwam.post('hash', function(params, callback)
{
  // parse POST parameters
  this.parseRequestBody(function(err, params)
  {
    var hash;

    // just pass error upstream
    if (err) return callback(err);

    // hash creating logic ...
    hash = params.test;

    // return hash
    callback(null, {hash: hash});
  });

});

// [GET method] fetches long url based on hash
wigwam.get('hash/:hash', function(params, callback)
{
  var url;

  // url from hash fetching logic ...
  url = params.hash;

  // return hash
  callback(null, {url: url});
});

// process websocket (primus) events
wigwam.on('data connection disconnection', function wigwam_onData(socket, data)
{
  // listening for the events here ...
});

// start web server
wigwam.listen(defaults.port);

```

## TODO

- More docs
- Loose ends


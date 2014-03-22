var http = require('http')
  , Wigwam = require('./index') // use require('wigwam') for real project
  , publicDir = './public'
  , wigwam
  ;

// Example 1. Simplest, static files only
wigwam = new Wigwam(http.createServer(), {path: publicDir}).listen(11337);
console.log('Listening on 11337');


// Example 2. All in one
Wigwam(http.createServer(),
{
  static:
  {
    path: publicDir,
    url : '/'
  },
  api:
  {
    path: '/api/v0',
    get:
    {
      'test/:test': function(params, callback)
      {
        // successful response
        callback(null, {method: 'get', port: 11338});
      }
    },
    post:
    {
      'test': function(params, callback)
      {
        // successful response
        callback(null, {method: 'post', port: 11338});
      },
    }
  },
  websockets:
  {
    transformer: 'websockets'
  }
}).listen(11338);
console.log('Listening on 11338');


// Example 3. Static + API + Websockets
wigwam = new Wigwam(http.createServer());

wigwam.static(
{
  path: publicDir
});

wigwam.api(
{
  path: '/api/v1',
  get:
  {
    'test/:test': function(params, callback)
    {
      // unsuccessful response
      callback({code: 500, error: 'for get', port: 11339});
    }
  },
  post:
  {
    'test': function(params, callback)
    {
      // parse POST parameters
      this.parseRequestBody(function(err, data)
      {
        // unsuccessful response
        callback({code: 500, error: 'for post', port: 11339});
      });
    }
  }
});

wigwam.websockets(
{
  transformer: 'websockets',
  events:
  {
    'hello': function()
    {

    }
  }
});

wigwam.listen(11339);
console.log('Listening on 11339');


// Example 4. Verbose handlers
wigwam = new Wigwam(http.createServer(), {apiPath: '/api', transformer: 'websockets'}).listen(11340);
console.log('Listening on 11340');

wigwam.get('test/:test', function(params, callback)
{
  // successful response
  callback(null, {parameter: params.test, method: 'get', port: 11340});
});

wigwam.post('test', function(params, callback)
{
  // parse POST parameters
  this.parseRequestBody(function(err, data)
  {
    // successful response
    callback(null, {data: data, method: 'post', port: 11340});
  });
});

wigwam.on('hello', function()
{

});

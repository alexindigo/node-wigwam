var server = require('http').createServer()
  , Wigwam = require('wigwam')
  ;

var wigwam = new Wigwam(server, {path: './static'}).listen(1337);


Wigwam(server,
{
  path       : './static',
  apiPath    : '/api/v1',
  transformer: 'ws',

  static:
  {
    path: './static',
    url : '/'
  },
  api:
  {
    path: '/api/v1',
    get:
    {
      'hash/:hash': function()
      {

      }
    },
    post:
    {
      'hash': function()
      {

      },
    }
  },
  websockets:
  {
    transformer: 'ws'
  }
}).listen(1337);



wigwam.static(
{
  path       : config.path,
  // url        : '/',
  // passthrough: true, // no 404 for files
  // index      : config.index,
  // content    :
  // {
  //   max      : 1024*1024*64, // memory limit for cache
  //   maxAge   : 1000*60*10, // time limit for content cache
  // }
});

wigwam.api(
{
  path: '/api/v1',
  get:
  {
    'hash/:hash': function()
    {

    }
  },
  post:
  {
    'hash': function()
    {

    }
  }
});

wigwam.websockets(
{
  transformer: 'ws'
  events:
  {
    'hello': function()
    {

    }
  }
});

wigwam.listen(1337);


// verbose

wigwam.get('hash/:hash', function()
{

});

wigwam.post('hash', function()
{

});

wigwam.on('hello', function()
{

});

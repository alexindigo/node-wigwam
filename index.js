'use strict';

var path      = require('path')
  , qs        = require('querystring')
  , http      = require('http') // not as server, but for misc use

  // thrid-party
  , merge     = require('deeply')
  , st        = require('st')
  , MapleTree = require('mapleTree')
  , Primus    = require('primus')

  // defaults
  , defaults  =
    {
      // default options for `st`atic files server
      static:
      {
        url        : '/',
        passthrough: true, // no 404 for files
        index      : 'index.html',
        content    :
        {
          max      : 1024*1024*64, // memory limit for cache – 64Mb should be enough for everybody :)
          maxAge   : 10*60*1000, // time limit for content cache – 10 minutes
        }
      },
      // default options for the api server
      api:
      {
        maxLength     : 1024, // max length of request body in bytes, 0 for unlimited
        contentType   : 'application/json',
        responseEncode: JSON.stringify,
        requestDecode : qs.parse
        // TODO: Added decoder per content type
        // 'application/x-www-form-urlencoded' -> qs.parse
        // 'application/json' -> JSON.parse
        // 'multipart/form-data' -> Formidable ? user-land
      },
      // default options for (primus) websockets server
      websockets:
      {
      }
    }
  ;

// do the thing
module.exports = Wigwam;

// main thing
function Wigwam(server, options)
{
  if (!(this instanceof Wigwam)) return new Wigwam(server, options);

  // submodules instances storage
  this.instance = {};

  // keep reference to the server
  this.instance.server = server;

  // shortcut for the empty options
  if (!options)
  {
    this.options = defaults;
  }
  else
  {
    // {{{ override defaults with custom options
    this.options = {};
    // static files server
    this.options.static = merge(defaults.static, options.static || {});
    // api server
    this.options.api = merge(defaults.api, options.api || {});
    // websockets server
    this.options.websockets = merge(defaults.websockets, options.websockets || {});
    // }}}

    // {{{ set convenience options
    // static files local path
    options.path && (this.options.static.path = options.path);
    // api uri prefix
    options.apiPath && (this.options.api.path = options.apiPath);
    // }}}
  }

  this._init();
}

// Setup methods

// static files server setup
Wigwam.prototype.static = function Wigwam_static(options)
{
  return this;
}

// api server setup
Wigwam.prototype.api = function Wigwam_api(options)
{
  return this;
}

// web sockets server setup
Wigwam.prototype.websockets = function Wigwam_api(options)
{
  return this;
}

// start doing useful stuff
Wigwam.prototype.listen = function Wigwam_listen(port, host)
{
  this.instance.server.listen(port, host);
  return this;
}

// API methods

Wigwam.prototype.get = function Wigwam_get(route, handler)
{
  this._addRoute('get', route, handler);
  return this;
}

Wigwam.prototype.post = function Wigwam_post(route, handler)
{
  this._addRoute('post', route, handler);
  return this;
}

Wigwam.prototype.put = function Wigwam_put(route, handler)
{
  this._addRoute('put', route, handler);
  return this;
}

Wigwam.prototype.delete = function Wigwam_delete(route, handler)
{
  this._addRoute('delete', route, handler);
  return this;
}


// Semi-private methods, not part of the public interface

// creates submodules instances
Wigwam.prototype._init = function Wigwam__init()
{
  // create static files server
  this.instance.files = st(this.options.static);

  // create api routing storage
  // separate routes per HTTP method
  this.instance.api = {};

  // attach to http server
  this.instance.server.on('request', this._requestHandler.bind(this));
}

// Generic method for routes addition
Wigwam.prototype._addRoute = function Wigwam__addRoute(method, route, handler)
{
  // make it uppercase as HTTP methods
  method = method.toUpperCase();

  // TODO: Check method exists
  // normailize slashes and generate route
  // TODO: '/' case
  route = '/' + this.options.api.path.replace(/(^\s*\/|\/\s*$)/g, '') + '/' + route.replace(/^\s*\//, '');

  // create namespace if doesn't exist yet
  if (!this.instance.api[method])
  {
    this.instance.api[method] = new MapleTree.RouteTree();
  }

  // add
  this.instance.api[method].define(route, handler)
}

// Handles http requests
Wigwam.prototype._requestHandler = function Wigwam__requestHandler(req, res)
{
  var _wigman = this
    , match
    , host // host object for route method to be bound to
    // HEAD and GET available for static files
    , allowedMethods = unique(['HEAD', 'GET'], Object.keys(this.instance.api))
    ;

  // check if response already finished
  if (res.finished) return;

  // check if method supported
  if (allowedMethods.indexOf(req.method) == -1)
  {
    // return 405 Method Not Allowed
    // with the list of allowed methods
    res.setHeader('Allow', allowedMethods.join(' '));
    this._responseHandler(res, 405);
    return;
  }

  // check request body length length
  if (+this.options.api.maxLength && +req.headers['content-length']
    && +this.options.api.maxLength < +req.headers['content-length'])
  {
    this._responseHandler(res, 413); // Request Entity Too Large
    return;
  }

  // check api router
  if ((match = this.instance.api[req.method].match(req.url)).perfect)
  {
    // fill host object with useful stuff
    host =
    {
      // data
      extras  : match.extras,
      request : req,
      response: res,
      // request specific methods
      parseRequestBody: this._requestParser.bind(this, req)
    };

    // execute matched method
    match.fn.call(host, match.params, function Wigwam__requestHandler_matchedRoute_cb(err, body)
    {
      if (err) return _wigman._responseHandler(res, err.code, err);

      // not an error
      _wigman._responseHandler(res, 200, body); // Ok
    });

    // and be done here
    return;
  }

  // check for local files
  this.instance.files(req, res, function Wigwam__requestHandler_fileNotFound()
  {
    // nothing
    _wigman._responseHandler(res, 404); // Not Found
  });
}

// Handles response finishing touches
Wigwam.prototype._responseHandler = function Wigwam__responseHandler(res, code, body)
{
  var code = code || 500 // server error by default
    , body = body || http.STATUS_CODES[code] // by default standard http message
    ;

  // inconvenient case when err is just code number
  // treat that number as code status
  if (code == 500 && typeof body == 'number' && body > 99)
  {
    code = body;
    body = http.STATUS_CODES[code];
  }

  res.writeHead(code, {'Content-type': this.options.api.contentType});
  res.end(this.options.api.responseEncode(body));
}

// Collects and parses request body
Wigwam.prototype._requestParser = function Wigwam__requestParser(req, callback)
{
  var _wigwam = this
    , body    = new Buffer('')
    ;

  // collect data first
  req.on('data', function Wigwam__requestParser_onData(data)
  {
    var newLength;

    if ((newLength = body.length + data.length) > _wigwam.options.api.maxLength) return callback(413); // Request Entity Too Large

    body = Buffer.concat([body, data], newLength);
  });

  // parse params
  req.on('end', function Wigwam__requestParser_onDataEnd()
  {
    var params;

    try
    {
      params = _wigwam.options.api.requestDecode(body.toString('utf8'));
    }
    catch (e)
    {
      return callback(400); // Bad Request
    }

    callback(null, params);
  });
}

// Santa's little helpers

// Removes duplicates from the list of arrays
// TODO: So far it's only function like that,
//       if we get more switch to lodash
function unique(/* a[, b[, ...]]*/)
{
  var i, a
    , result = []
    ;

  // unique
  while (a = Array.prototype.shift.call(arguments))
  {
    for (i=0; i<a.length; i++)
    {
      if (result.indexOf(a[i]) == -1)
      {
        result.push(a[i]);
      }
    }
  }

  return result;
}

var http = require('http')
var EventEmitter = require('events').EventEmitter
var _ = require('highland')
var through = require('through2')

module.exports = function(app) {
  var responsesStream = through.obj(function(obj, enc, cb) {
    var handle = function(obj) {
      if (obj.status) obj.res.statusCode = obj.status

      if (_.isStream(obj.body)) {
        var st = obj.body.errors(function (err) {
          errEm.emit('err', {err: err, res: obj.res}) 
        })
        st.pipe(obj.res)
      }
      else if (typeof obj.body === 'string') obj.res.end(obj.body)
      else obj.res.end(JSON.stringify(obj.body)) // assume object
    }

    if (_.isStream(obj)) obj.fork().each(handle)
    else handle(obj)

    cb()
  })

  var em = new EventEmitter()
  var errEm = new EventEmitter()
  var server = http.createServer(function(req, res) {
    req.res = res
    em.emit('request', req)
  })

  var responses = app(_('request', em), _('err', errEm))
  responses.errors(function(err) {
    errEm.emit('err', {err})
  }).pipe(responsesStream)

  return server
}

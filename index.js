/* Copyright (c) 2014 Matteo Collina, ISC License
 *
 * Based on seneca-jsonfile-store
 * Copyright (c) 2013 Richard Rodger, MIT License */
"use strict";

var Sharder = require('sharder')
var async = require('async')
var name = 'shard-store'

var Seneca = require('seneca')

var _ = require('lodash')

module.exports = function(seneca, opts, cb) {

  for(var shardId in opts.shards) {
    var shard = opts.shards[shardId]
    shard.seneca = Seneca(shard.seneca)
    shard.seneca.use( shard.store.plugin, shard.store.options);
  }

  var shards = new Sharder(opts)

  function shardWrap(args, cb) {
    var seneca = this

    var id
      , shard

    if (args.ent) {
      id = args.ent.id
    } else if (args.q) {
      id = args.q.id
    }

    if (args.cmd !== 'save' && !id) {
      // shardWrapAll.call here is just to be clean and execute wrapAll in the right seneca context
      return shardWrapAll.call(seneca, args, function(err, list) {
        cb(err, list && list[0])
      })
    }

    if (args.cmd === 'save' && !id) {
      id = args.ent.id || shards.generate()
      args.ent.id$ = id
    }

    shard = shards.resolve(id)

    shard.seneca.act(args, cb)
  }

  function shardWrapAll(args, cb) {
    var seneca = this

    async.concat(Object.keys(shards.shards), function(shardId, cb) {
      var shard = shards.shards[shardId]

      shard.seneca.act(args, function(err, result) {
        if(err) {
          this.log.error(err)
        }

        cb(undefined, result)
      })
    }, function(err, result) {

      if(!err && result) {
        merge(args, result)
      }
      cb(err, result)
    })
  }

  var store = {
    name: name,

    save: shardWrap,

    load: shardWrap,

    list: shardWrapAll,

    remove: shardWrapAll,

    close: shardWrapAll,

    native: function(done){
      done(null,opts)
    }
  }


  seneca.store.init(seneca,opts,store,function(err,tag,description){
    if( err ) return cb(err);

    cb(null,{name:store.name,tag:tag})
  })
}

function merge(args, list) {
  distinct(args, list)
  sort(args, list)
}

function distinct(args, list) {
  if(args && args.cmd === 'list' && args.q && args.q.distinct$) {
    if(_.isArray(list)) {
      var distinct = args.q.distinct$
      var index = 0
      var visited = {}
      while(index < list.length) {
        var item = _.clone(list[index])
        delete item.id
        if(!visited.hasOwnProperty(JSON.stringify(item))) {
          visited[JSON.stringify(item)] = true
          index++
        } else {
          list.splice(index, 1)
        }
      }
    }
  }
}

function sort(args, list) {
  if(args && args.cmd === 'list' && args.q && args.q.sort$) {
    if(_.isArray(list)) {
      list.sort(function(a, b) {
        if(!a && !b) {
          return 0
        } else if(a && !b) {
          return 1
        } else if(!a && b) {
          return -1
        } else {
          for(var sortAttr in args.q.sort$) {
            if(a[sortAttr] === b[sortAttr]) {
              continue
            } else if (a[sortAttr] < b[sortAttr]) {
              return +args.q.sort$[sortAttr]
            } else {
              return -args.q.sort$[sortAttr]
            }
          }
          return 0
        }
      })

    }
  }

}

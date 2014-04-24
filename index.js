/* Copyright (c) 2014 Matteo Collina, ISC License
 *
 * Based on seneca-jsonfile-store
 * Copyright (c) 2013 Richard Rodger, MIT License */
"use strict";

var Sharder = require('sharder')
var async = require('async')
var name = 'shard-store'

var Seneca = require('seneca')

module.exports = function(seneca, opts, cb) {

  for(var shardId in opts.shards) {
    var shard = opts.shards[shardId]
    shard.seneca = Seneca()
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
    // TODO should we handle reordering of results?
    async.concat(Object.keys(shards.shards), function(shardId, cb) {
      var shard = shards.shards[shardId]

      shard.seneca.act(args, function(err, result) {
        if(err) {
          this.log.error(err)
        }
        cb(undefined, result)
      })
    }, cb)
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



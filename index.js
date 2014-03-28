/* Copyright (c) 2014 Matteo Collina, ISC License
 *
 * Based on seneca-jsonfile-store
 * Copyright (c) 2013 Richard Rodger, MIT License */
"use strict";


var sharder = require('sharder')
var async = require('async')
var name = 'shard-store'


module.exports = function(seneca,opts,cb) {

  var shards = sharder(opts);

  function shardWrap(args, cb) {
    var ent = args.ent
    ent.id = ent.id || shards.generate()

    var shard = shards.resolve(ent.id)

    var toact = Object.create(args)
    toact.name = shard.name
    toact.base = shard.base
    toact.zone = shard.zone

    seneca.act(toact, cb)
  }

  function shardWrapAll(args, cb) {
    // TODO should we handle reordering of results?

    async.concat(Object.keys(shards.shards), function(shard, cb) {
      var toact = Object.create(args)
      shard = shards.shards[shard]

      toact.name = shard.name
      toact.base = shard.base
      toact.zone = shard.zone

      seneca.act(toact, cb)
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



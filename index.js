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

  function act(args, shard, cb, skipError) {
    var toact = Object.create(args)

    if (shard.name)
      toact.name = shard.name

    if (shard.base)
      toact.base = shard.base

    if (shard.zone)
      toact.zone = shard.zone

    seneca.act(toact, function(err, result) {
      cb(!skipError && err, result)
    })
  }

  function shardWrap(args, cb) {
    if(args.zone) {
      this.prior(args, cb) // call the DB directly if the zone is already set
    }

    var id
      , shard

    if (args.ent) {
      id = args.ent.id
    } else if (args.q) {
      id = args.q.id
    }

    if (args.cmd !== 'save' && !id) {
      // shardWrapAll.call here is just to be clean and execute wrapAll in the right seneca context
      return shardWrapAll.call(this, args, function(err, list) {
        cb(err, list && list[0])
      })
    }

    if (args.cmd === 'save' && !id) {
      id = args.ent.id || shards.generate()
      args.ent.id$ = id
    }

    shard = shards.resolve(id)

    act(args, shard, cb)
  }

  function shardWrapAll(args, cb) {
    if(args.zone) {
      this.prior(args, cb) // call the DB directly if the zone is already set
    }

    // TODO should we handle reordering of results?
    async.concat(Object.keys(shards.shards), function(shard, cb) {
      act(args, shards.shards[shard], cb, true)
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



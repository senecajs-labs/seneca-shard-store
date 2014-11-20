/* Copyright (c) 2014 Matteo Collina, ISC License
 *
 * Based on seneca-jsonfile-store
 * Copyright (c) 2013 Richard Rodger, MIT License */
"use strict";

var Sharder = require('sharder')
var async = require('async')
var Seneca = require('seneca')
var name = 'shard-store'


module.exports = function(opts) {
  var seneca=this;


  /**
   * configure the store - create a new store specific connection object
   *
   * params:
   * spec - store specific configuration
   * cb - callback
   */
  var shards
  function configure(specification, cb) {


    for(var shardId in specification.shards) {
      var shard = specification.shards[shardId]
      shard.seneca = Seneca()
      shard.seneca.use( shard.store.plugin, shard.store.options);
    }

    shards = new Sharder(specification)

    cb(null, shards);

  }

  function shardWrap(args, cb) {
    var seneca = this

    var id
      , shard

    if (args.ent) {
      id = args.ent.id$
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

    if(args.zone){
      for(var sh in shards._appendShards){
        if(shards._appendShards[sh].zone === args.zone){
          shard=shards._appendShards[sh];
        }
      }
    }


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
    }, function(err,result){
      if((args.cmd === 'save' ||args.cmd === 'load') &&  result.length==0)
      {
        result=null;
      }
      cb(err,result);
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


  /**
   * initialization
   */
  var meta = seneca.store.init(seneca, opts, store);
  var desc = meta.desc;
  seneca.add({init:store.name,tag:meta.tag}, function(args,done) {
    configure(opts, function(err) {
      if (err) {
        return seneca.fail({code:'entity/configure', store:store.name, error:err, desc:desc}, done);
      }
      else done();
    });
  });

  return { name:store.name, tag:meta.tag };

}





/* Copyright (c) 2014 Matteo Collina, ISC License
 *
 * Based on seneca-jsonfile-store
 * Copyright (c) 2013 Richard Rodger, MIT License */
"use strict";


var sharder = require('sharder')
var name = 'shard-store'


module.exports = function(seneca,opts,cb) {

  var shards = sharder(opts);

  var store = {
    name: name,

    save: function(args,cb) {
      console.log(args)
      cb(new Error('not implemented yet'))
    },


    load: function(args,cb) {
      cb(new Error('not implemented yet'))
    },


    list: function(args,cb) {
      cb(new Error('not implemented yet'))
    },


    remove: function(args,cb) {
      cb(new Error('not implemented yet'))
    },


    close: function(cb) {
      cb(new Error('not implemented yet'))
    },


    native: function(done){
      done(null,opts)
    }
  }


  seneca.store.init(seneca,opts,store,function(err,tag,description){
    if( err ) return cb(err);

    cb(null,{name:store.name,tag:tag})
  })
}



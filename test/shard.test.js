/*jslint node: true, asi: true */
/* Copyright (c) 2014 Matteo Collina, ISC License */

"use strict";

var seneca = require('seneca')
var shared = require('seneca-store-test')
var fs = require('fs')
var rimraf = require('rimraf')
var assert = require('assert')
var async = require('async')
var uuid = require('node-uuid')

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it

var db1 = __dirname + '/db1'
var db2 = __dirname + '/db2'

var si = seneca({
  log: 'silent',
  default_plugins: {'mem-store': false}
})
si.use(require('..'),{
  shards: {
    1: {
      zone: 'store1',
      append: true,
      store: {
        plugin:'seneca-jsonfile-store',
        options:
        {
          map: {
            'store2/-/-': '*'
          },
          folder: db2
        }
      }
    },
    2: {
      zone: 'store2',
      append: true,
      store: {
        plugin:'seneca-jsonfile-store',
        options:
        {
          map: {
            'store1/-/-': '*'
          },
          folder: db1
        }
      }
    }
  }
})

si.__testcount = 0
var testcount = 0
describe('shard-store', function(){

  var beforeEach = lab.beforeEach;
  var after = lab.after;

  var self=this

  beforeEach(function clearDb (done) {
    async.series([
      function clearFoo (next) {
        si.make('foo').remove$({ all$: true }, next)
      },
      function clearBar (next) {
        si.make('zen', 'moon', 'bar').remove$({ all$: true }, next)
      },
      function clearProduct (next) {
        si.make('product').remove$({ all$: true }, next)
      }
    ], done)
  })

  after(function(done) {
    rimraf(db1, function() {
      rimraf(db2, done)
    })
  })

  it('basic', function(done){
    testcount++
    shared.basictest(si,done)
  })

  it('close', function(done){
    shared.closetest(si,testcount,done)
  })

  it('load with q.id', function(done) {

    var Product = si.make('product')
    var product = Product.make$({name:'pear',price:200})
    product.save$(function(err, product) {
      assert(!err);
      si.act(
        { role:'entity', cmd:'load', q:{id:product.id}, qent:Product},
        function( err, product ) {
          assert(!err)
          done()
        })
    })

  })

  it('load with q.name', function(done) {

    var Product = si.make('product')
    var product = Product.make$({name:'pear',price:200})
    product.save$(function(err, product) {
      assert(!err);
      si.act(
        { role:'entity', cmd:'load', q:{name:'pear'}, qent:Product},
        function( err, product ) {
          assert(!err)
          assert(product)
          done()
        })
    })

  })

  function prepareCompleted(num, done) {
    var received = 0
      , seen = 0

    return function completed(err, p) {
      received++
      if (p) {
        console.log('product', p)
        seen++
      }

      if (received === num) {
        assert.equal(1, seen)
        done()
      }
    }
  }

  it('should store it only in a store', function(done) {

    var Product = si.make('product')
      , product = Product.make$({name:'pear',price:200})
      , completed = prepareCompleted(2, done)

    product.save$(function(err, product) {
      assert(!err);
      si.act(
        { role:'entity', zone: 'store1', cmd:'load', q:{id:product.id}, qent:Product},
        completed)

      si.act(
        { role:'entity', zone: 'store2', cmd:'load', q:{id:product.id}, qent:Product},
        completed)
    })
  })

  it('should store it only in a store with an update', function(done) {

    var Product = si.make('product')
      , product = Product.make$({name:'pear',price:200})
      , completed = prepareCompleted(2, done)

    product.save$(function(err, product) {
      product.price = 300
      product.save$(function(err, product) {
        si.act(
          { role:'entity', zone: 'store1', cmd:'load', q:{id:product.id}, qent:Product},
          completed)

        si.act(
          { role:'entity', zone: 'store2', cmd:'load', q:{id:product.id}, qent:Product},
          completed)
      })
    })
  })

  it('should reorder multi shard aggregate on list.sort$', function(done) {

    var uniqueName = uuid.v4()

    var Product = si.make('product')

    var product1 = Product.make$({name: uniqueName, rank: 0})
    var product2 = Product.make$({name: uniqueName, rank: 1})
    var product3 = Product.make$({name: uniqueName, rank: 2})
    var product4 = Product.make$({name: uniqueName, rank: 3})

    product1.save$(function(err, product) {
      assert(!err);

      product2.save$(function(err, product) {
        assert(!err);

        product3.save$(function(err, product) {
          assert(!err);

          product4.save$(function(err, product) {
            assert(!err);

            si.act(
              {
                role: 'entity',
                cmd: 'list',
                q: {
                  name: uniqueName,
                  sort$: {
                    rank: -1
                  }
                },
                qent: Product
              },
              function( err, orderedProducts ) {
                assert(!err, err ? err.toString() : '')
                assert.ok(orderedProducts)
                assert.equal(orderedProducts.length, 4)
                for(var i = 0; i < orderedProducts.length ; i++) {
                  assert.equal(orderedProducts[i].rank, i, 'expected the shard plugin to reorder the aggregate result of a LIST command')
                }
                done()
              }
            )

          })
        })
      })
    })
  })

  it('should skip',function(done){
    var Product = si.make('product')
      , product = Product.make$({name:'pear',price:200})
      , completed = prepareCompleted(2, done)

    var task= []
    for(var i=0;i<20; i++){

     task.push(function(cb){
       Product = si.make('product')
       product = Product.make$({name:'pear',price:i*100})
       product.save$(function(err, product) {
         cb();
       })
     })
    }

    task.push(function(cb){
      Product = si.make('product')
      product = Product.make$()
      product.list$({skip$:5},function(err, results){
        assert.equal(15,results.length)

        done()
      })

    })
    async.series(task);

  })



  it('should limit',function(done){
    var Product = si.make('product')
      , product = Product.make$({name:'pear',price:200})
      , completed = prepareCompleted(2, done)

    var task= []
    for(var i=0;i<20; i++){

      task.push(function(cb){
        Product = si.make('product')
        product = Product.make$({name:'pear',price:i*100})
        product.save$(function(err, product) {
          cb();
        })
      })
    }

    task.push(function(cb){
      Product = si.make('product')
      product = Product.make$()
      product.list$({skip$:5,limit$:10},function(err, results){
        assert.equal(10,results.length)

        done()
      })

    })
    async.series(task);

  })

  function deleteFolderRecursive(path) {
    var files = [];
    if( fs.existsSync(path) ) {
      files = fs.readdirSync(path);
      files.forEach(function(file,index){
        var curPath = path + "/" + file;
        if(fs.lstatSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  };
})



/*jslint node: true, asi: true */
/*globals describe, it */
/* Copyright (c) 2014 Matteo Collina, ISC License */

"use strict";

var seneca = require('seneca')
var shared = seneca.test.store.shared
var fs = require('fs')
var rimraf = require('rimraf')
var assert = require('assert')

describe('double', function(){
  var si = seneca()
  var db1 = __dirname + '/db1'
  var db2 = __dirname + '/db2'

  fs.mkdirSync(db1)
  fs.mkdirSync(db2)

  si.use(require('seneca-jsonfile-store'),{
    map: {
      'store1/-/-': '*'
    },
    folder: __dirname + '/db1'
  })

  si.use(require('seneca-jsonfile-store'),{
    map: {
      'store2/-/-': '*'
    },
    folder: __dirname + '/db2'
  })

  si.use(require('..'),{
    shards: {
      1: {
        zone: 'store1',
        append: true
      },
      2: {
        zone: 'store2',
        append: true
      }
    }
  })

  si.__testcount = 0
  var testcount = 0

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
})



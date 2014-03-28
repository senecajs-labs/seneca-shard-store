# seneca-shard-store

### Node.js seneca data storage module that uses multiple stores

This module is a plugin for the Seneca framework. It provides a
storage engine that uses multiple stores, called shards.
The data is divided equally at time of creation, using an id
built by the [sharder](http://npm.im/sharder) module.

### Support

If you're using this module, feel free to contact me on twitter if you
have any questions! :) [@matteocollina](http://twitter.com/matteocollina)


### Quick example

This example uses two
[jsonfile-store](https://github.com/rjrodger/seneca-jsonfile-store).

```JavaScript
var seneca = require('seneca')()
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

seneca.ready(function(){
  var apple = seneca.make$('fruit')
  apple.name  = 'Pink Lady'
  apple.price = 0.99
  apple.save$(function(err,apple){
    console.log( "apple.id = "+apple.id  )
  })
})
```


## Install

```sh
npm install seneca
npm install seneca-shard-store
```


## Usage

You don't use this module directly. It provides an underlying data storage engine for the Seneca entity API:

```JavaScript
var entity = seneca.make$('typename')
entity.someproperty = "something"
entity.anotherproperty = 100

entity.save$( function(err,entity){ ... } )
entity.load$( {id: ...}, function(err,entity){ ... } )
entity.list$( {property: ...}, function(err,entity){ ... } )
entity.remove$( {id: ...}, function(err,entity){ ... } )
```


## Test

```bash
cd test
mocha shard.test.js --seneca.log.print
```


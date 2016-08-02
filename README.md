![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] data storage plugin

# seneca-shard-store
[![Build Status][travis-badge]][travis-url]
[![Gitter][gitter-badge]][gitter-url]

### Node.js seneca data storage module that uses multiple stores

This module is a plugin for the Seneca framework. It provides a
storage engine that uses multiple stores, called shards.
The data is divided equally at time of creation, using an id
built by the [sharder](http://npm.im/sharder) module.

## Install

```sh
npm install seneca
npm install seneca-shard-store
```
## Test

```bash
cd test
mocha shard.test.js --seneca.log.print
```
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


### Support

If you're using this module, and need help, you can:

- Post a [github issue][],
- Tweet to [@senecajs][],
- Ask on the [Gitter][gitter-url].




## Contributing
The [Senecajs org][] encourage open participation. If you feel you can help in any way, be it with
documentation, examples, extra testing, or new features please get in touch.

## Acknowledgements

This project was kindly sponsored by [nearForm](http://nearform.com).

## License
Copyright Matteo Collina and other contributors 2014-2016, Licensed under [MIT][].


[travis-badge]: https://travis-ci.org/senecajs-labs/seneca-shard-store.svg
[travis-url]: https://travis-ci.org/senecajs-labs/seneca-shard-store
[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-url]: https://gitter.im/senecajs/seneca

[MIT]: ./LICENSE
[Senecajs org]: https://github.com/senecajs/
[senecajs.org]: http://senecajs.org/
[Seneca.js]: https://www.npmjs.com/package/seneca
[github issue]: https://github.com/senecajs/seneca-shard-store/issues
[@senecajs]: http://twitter.com/senecajs

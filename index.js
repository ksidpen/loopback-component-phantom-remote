'use strict';

var promise = require("bluebird");
var request = require('request');
var base64 = require('base64-stream');

module.exports = {
  initialize: function(dataSource, callback) {

    var settings = dataSource.settings || {};

    function createRenderings(renderings) {
      return promise.mapSeries(renderings, function(rendering) {
        return createRendering(
          rendering.id, rendering.html, rendering.extension, rendering.folder)
      });
    }

    function createRendering(id, html, extension, folder) {
      var Container = dataSource.models.Container;
      var app = Container.app;
      var storage = app.datasources.storage;

      var args = app.get('phantom');
      args.format = extension;

      return new promise(function(resolve, reject) {
        var req = request({
          method: 'post',
          body: {
            id: id,
            html: html,
            options: args
          },
          json: true,
          url: settings.url + '/print'
        }, function (err){
          if (err)
            reject(err)
        })
        req.on('error', function(err) {
          reject(err)
        })
        var decodedReq = req.pipe(base64.decode())

        Container.uploadFromStream(decodedReq,
          storage.settings.container,
          folder + id + '.' + extension)
        .then(function(result){
          resolve(result);
        })
        .catch(function(e){
          reject(e);
        })
      });

    }

    function getRendering(id, req, res, cb, extension, folder) {
      var Container = dataSource.models.Container;
      var app = Container.app;

      folder = folder || '';

      return Container.download(app.datasources.storage.settings.container,
        folder + id + '.' + extension, req, res, cb);
    }

    var connector = {
      createRendering: createRendering,
      getRendering: getRendering,
      createRenderings: createRenderings
    };

    dataSource.connector = connector;
    dataSource.connector.dataSource = dataSource;

    callback();
  }
}

var nconf = require('nconf');
var async = require('async');
var Minio = require('minio');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');
var helpers = require('nodetopia-lib/helpers');


var io = require('./io');
var utils = require('./utils');

var minioClient = new Minio(nconf.get('s3'));

kue.jobs.process('fleet.app.scale', 999, function(job, done) {

	job.log('-----> Scale starting');

	helpers.docs({
		name : job.data.name,
		build : job.data.build,
		organization : job.data.organization
	}, function(err, docs) {
		mongoose.Container.find({
			reference : docs.app._id,
			$or : [{
				'state' : 'RUNNING'
			}, {
				'state' : 'STARTING'
			}, {
				'state' : 'INITIALIZING'
			}],
			type : {
				$nin : ['addon', 'build']
			}
		}, function(err, containers) {

			if (err)
				return done(err);

			var handleResponce = utils.handleResponce();
			var types = {};
			var remove = [];
			var add = [];

			for (var i = 0; i < containers.length; i++) {
				if (!types[containers[i].type]) {
					types[containers[i].type] = [];
				}
				types[containers[i].type].push(containers[i]);
			};
			async.parallel(Object.keys(types).map(function(key) {
				return function(next) {
					var unit;
					for (var i = 0,
					    j = docs.formation.commands.length; i < j; i++) {
						if (docs.formation.commands[i].type == key) {
							unit = docs.formation.commands[i];
							break;
						}
					};
					if (!unit) {
						return;
					}

					types[key].sort(function(a, b) {
						return a.index - b.index;
					});

					if (types[key].length > unit.quantity) {
						for (var i = types[key].length - 1; i >= unit.quantity; i--) {
							remove.push(types[key][i]);
						};
						next();
					} else if (types[key].length - 1 < unit.quantity) {

						minioClient.presignedGetObject('tar', docs.build.build.path, 15 * 60, function(err, url) {
							if (err) {
								return next(err);
							}
							for (var i = types[key].length; i < unit.quantity; i++) {
								add.push(utils.formationConfig(docs, {
									size : unit.size,
									cmd : ['/run.sh', unit.type, url],
									type : unit.type,
									index : i
								}));
							};
							next();
						});

					}

				};
			}), function(err, result) {

				function stop(cb) {
					async.parallel(remove.map(function(container) {
						return function(next) {
							kue.fleet.stop({
								container : container._id
							}, next);
						};
					}), function(errs, res) {
						handleResponce.stop(errs, res);
						cb();
					});
				}

				function start(cb) {
					async.parallel(add.map(function(formation) {
						return function(next) {
							kue.fleet.start(formation, next);
						};
					}), function(errs, res) {

						handleResponce.start(errs, res);
						cb();
					});
				}

				if (remove.length) {
					stop(function() {
						done(null, {
							error : handleResponce.errors,
							results : handleResponce.results
						});
					});
				} else if (add.length) {
					start(function() {
						done(null, {
							error : handleResponce.errors,
							results : handleResponce.results
						});
					});
				} else {
					done(null, {
						error : handleResponce.errors,
						results : handleResponce.results
					});
				}

			});

		});

	});
});

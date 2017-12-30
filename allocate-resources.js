var nconf = require('nconf');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');

var io = require('./io');
var utils = require('./utils');

kue.jobs.process('fleet.allocate.resources', 1, function(job, done) {
	var size = job.data.size;
	var zones = job.data.zones;

	var testedNodes = {};

	function getNode(err, node) {
		if (err)
			return done(err);
		console.log(err, node)
		function spawn(err, node) {

			if (node) {
				return getNode(err, node);
			}

			mongoose.ScalewayType.findOne({
				$or : zones.map(function(zone) {
					return {
						zone : zone.name
					};
				}),
				memory : {
					$gte : size.memory
				},
				cpu : {
					$gte : size.cpuset
				}
			}, function(err, type) {

				var options = {
					environment : 'development',
					multiTenant : !size.dedicated
				};

				var nodeData = {
					id : utils.getServerName(),
					zone : zones[0].name,
					reserved : true,
					multitenant : !size.dedicated,
					memory : {
						used : 0,
						total : Math.ceil(type.memory / 256) * 256
					},
					cores : {
						count : type.cpu,
						used : []
					}
				};
				for (var i = 0; i < type.cpu; i++) {
					nodeData.cores.used.push(0);
				};

				node = new mongoose.Node(nodeData);

				size = utils.addNodeResources(node, size);

				node.save(function() {
					done(null, {
						node : node,
						size : size
					});
					kue.scw.spawn.port({
						type : type.name,
						name : node.id,
						options : options
					});
				});
			});
		}

		if (!node) {
			return mongoose.Node.getZone({
				size : size,
				zones : zones,
				reserved : true
			}, spawn);
		}

		var socket = io.sockets.connected[node.socketId];

		if (!node.reserved && !socket) {
			node.is_active = false;
			return node.save(function() {
				mongoose.Node.getZone({
					size : size,
					zones : zones
				}, getNode);
			});
		}

		if (testedNodes[node.id]) {
			return spawn();
		}

		testedNodes[node.id] = true;

		if (utils.testNodeResources(node, size)) {
			mongoose.Node.getZone({
				size : size,
				zones : zones
			}, getNode);
		} else {
			size = utils.addNodeResources(node, size);
			node.markModified('cores.used');
			node.save(function() {
				done(null, {
					node : node,
					size : size
				});
			});
		}

	}


	console.log({
		size : size,
		zones : zones
	})

	mongoose.Node.getZone({
		size : size,
		zones : zones
	}, getNode);
});

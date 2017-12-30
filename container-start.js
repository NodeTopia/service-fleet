var nconf = require('nconf');
var uuid = require('node-uuid');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');

var io = require('./io');


kue.jobs.process('fleet.container.start', 999, function(job, done) {

	function onNode(err, result) {
		if (err) {
			kue.events.emit('fleet.error', err);
			return done(err);
		}

		var node = result.node;
		var size = result.size;

		var socket = io.sockets.connected[node.socketId];

		if (!socket) {
			err = new Error('The node that the container was going to run on is not loger active');
			kue.events.emit('fleet.error', err);
			return done(err);
		}

		if (job.data.container.restartable === undefined) {
			job.data.container.restartable = true;
		}

		job.data.container.uid = job.data.container.uid || uuid.v4();
		job.data.container.size = size;
		job.data.container.logs = nconf.get('logs');

		var container = new mongoose.Container({
			reference : job.data.reference,
			node : node._id,
			uid : job.data.container.uid,
			restartable : job.data.container.restartable,
			shortLived : !!job.data.container.shortLived,
			is_restart : job.data.container.is_restart,
			type : job.data.type,
			state : 'INITIALIZING',
			config : job.data.container
		});

		function onSave(err) {
			if (err) {
				kue.events.emit('fleet.error', err);
				return done(err);
			}

			kue.events.emit('fleet.state.' + container.state.toLocaleLowerCase(), container);

			socket.emit('start', job.data.container, function(err, con) {
				if (err) {
					kue.events.emit('fleet.error', err);
					return done(err);
				}

				container.ports = con.ports || [];
				container.state = con.state;
				container.name = con.name;
				container.env = con.env;
				container.id = con.id;

				container.save(function(err) {
					if (err) {
						kue.events.emit('fleet.error', err);
						return done(err);
					}

					if (container.ports.length > 0) {
						kue.events.emit('fleet.ports.add', container);
					}
					done(null, container);
				});

			});
		}


		container.save(onSave);
	}


	kue.fleet.allocate.resources({
		size : job.data.container.size,
		zones : job.data.container.zones
	}, function(err, result) {
		if (err) {
			kue.events.emit('fleet.error', err);
			return done(err);
		}

		if (result && result.node && result.node.reserved) {
			kue.events.once('fleet.node.init.' + result.node.id, function(node) {
				result.node = node;
				onNode(null, result);
			});
		} else {
			onNode(err, result);
		}

	});

});


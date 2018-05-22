var nconf = require('nconf');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');

var io = require('./io');


kue.jobs.process('fleet.container.stop', 999, function(job, done) {
	var id = job.data.container;
	console.log(id)
	function onNode(container, node) {
		if (!node) {
			var err = new Error('Node not found for "' + container.node + '" no need to stop');
			kue.events.emit('fleet.error', err);
			return done(err);
		}

		var socket = io.sockets.connected[node.socketId];

		if (!socket) {
			container.state = 'ZOMBIE';
			container.statusCode = 128;
			container.stopped_at = Date.now();
			return container.save(function(err) {
				if (err) {
					kue.events.emit('fleet.error', err);
				}
				err = new Error('Container was on a node that is no longer active');
				kue.events.emit('fleet.error', err);
				kue.events.emit('fleet.state.' + container.state.toLocaleLowerCase(), container);
				done(err);
			});
		}

		container.is_stopping = true;

		function onSave(err) {
			if (err)
				return done(errors.mongoose(err));
			socket.emit('stop', container.id||container.uid, function(error) {
				if (error) {
					container.state = 'CRASHED';
					container.statusCode = 127;
					container.stopped_at = Date.now();
					container.save(function(err) {
						if (err) {
							kue.events.emit('fleet.error', err);
						}
						kue.events.emit('fleet.error', error);
						kue.events.emit('fleet.state.' + container.state.toLocaleLowerCase(), container);
						done(error);

					});
				} else {

					container.state = 'STOPPED';
					container.statusCode = 0;
					container.stopped_at = Date.now();
					container.save(function(err) {
						if (err) {
							kue.events.emit('fleet.error', err);
							done(err);
						} else {
							done(null, container);
						}
					});
				}
			});
		}

		if (container.ports.length > 0) {
			kue.events.emit('fleet.ports.remove', container);
		}

		container.save(onSave);
	}


	mongoose.Container.findOne({
		_id : id
	}, function(err, container) {
		if (err) {
			kue.events.emit('fleet.error', err);
			return done(errors.mongoose(err));
		}
		if (!container) {
			err = new Error('Container not found for ' + id);
			kue.events.emit('fleet.error', err);
			return done(err);
		}
		mongoose.Node.findOne({
			_id : container.node
		}, function(err, node) {
			if (err) {
				kue.events.emit('fleet.error', err);
				return done(errors.mongoose(err));
			}

			onNode(container, node);
		});
	});
});

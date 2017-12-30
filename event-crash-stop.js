var nconf = require('nconf');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');

function removeUsage(container) {
	var nodeUpdate = {
		$inc : {
			'memory.used' : -container.config.size.memory
		}
	};
	var cores = typeof container.config.size.cpuset == 'number' ? [container.config.size.cpuset] : container.config.size.cpuset.split(',');
	for (var i = 0; i < cores.length; i++) {
		nodeUpdate['$inc']['cores.used.' + cores[i]] = -container.config.size.cpuShares;
	};

	mongoose.Node.update({
		_id : container.node
	}, nodeUpdate, function(err) {
		if (err) {
			kue.events.emit('fleet.error', err);
		}

	});
}

function crashStop(container) {
	mongoose.Container.update({
		_id : container._id
	}, {
		$set : {
			stopped_at : new Date()
		}
	}, function() {

	});
	if (container.is_stopping) {
		return;
	}
	if (container.is_restart) {
		return;
	}

	if (container.restartable) {
		return kue.fleet.restart({
			id : container._id
		}, function(err, data) {
			if (err) {
				kue.events.emit('fleet.error', err);
			}
		});
	}
	if (container.type == 'addon') {
		kue.events.emit('addon.stop.' + container.uid, container);
	}
	if (container.type == 'build') {
		kue.events.emit('build.complete.' + container.uid, container);
	}

}

function zombie(container) {
	if (container.ports.length > 0) {
		kue.events.emit('fleet.ports.remove', container);
	}
}

kue.events.on('fleet.state.zombie', zombie);

kue.events.on('fleet.state.crashed', crashStop);
kue.events.on('fleet.state.stopped', crashStop);

kue.events.on('fleet.state.crashed', removeUsage);
kue.events.on('fleet.state.stopped', removeUsage);

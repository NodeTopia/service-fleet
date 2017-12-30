var async = require('async');
var uuid = require('node-uuid');
var nconf = require('nconf');
var Minio = require('minio');
var Moniker = require('moniker');


var minioClient = new Minio(nconf.get('s3'));


var Moniker = Moniker.generator([Moniker.adjective, Moniker.noun]);
var utils = module.exports = {};

utils.removeNodeResources = function(size) {
	var node = {
		$inc : {
			'memory.used' : -size.memory
		}
	};
	var cores = typeof size.cpuset == 'number' ? [size.cpuset] : size.cpuset.split(',');
	for (var i = 0; i < cores.length; i++) {
		node['$inc']['cores.used.' + cores[i]] = -size.cpuShares;
	};
	return node;
};

utils.getServerName = function() {
	return Moniker.choose() + '-' + (Math.floor(Math.random() * 9999) + 1000) + '.cloud.' + nconf.get('urls:main');
};

function cpuShares(node) {

	var low = {
		i : 0,
		val : node.cores.used[0]
	};
	for (var i = 0,
	    j = node.cores.used.length; i < j; i++) {
		if (node.cores.used[i] < low.val) {
			low.val = node.cores.used[i];
			low.i = i;
		}
	};
	return low;
};
function addMemory(size, node) {
	node.memory.used += size.memory;
};
function addCores(size, node) {
	var CpusetCpus = [];
	var cores = typeof size.cpuset == 'number' ? size.cpuset : size.cpuset.split(',').length;

	for (var i = 0; i < cores; i++) {
		var core = cpuShares(node);

		if (core.val + size.cpuShares > 1024) {
			return true;
		}

		CpusetCpus.push(core.i);
		node.cores.used[core.i] += size.cpuShares;
	}

	size.cpuset = CpusetCpus.join();

	return false;
};
utils.addNodeResources = function(node, size) {
	var tmpSize = Object.assign({}, size);
	addCores(tmpSize, node);
	addMemory(tmpSize, node);
	return tmpSize
};
utils.testNodeResources = function(node, size) {
	var tmpSize = Object.assign({}, size);
	var tmpNode = {
		memory : {
			used : node.memory.used,
			total : node.memory.total
		},
		cores : {
			count : node.cores.count,
			used : node.cores.used.slice()
		}
	};
	console.log(tmpNode)
	if ((tmpNode.memory.used + tmpSize.memory) >= tmpNode.memory.total) {
		return true;
	} else if (addCores(tmpSize, tmpNode)) {
		return true;
	}
	return false;

};

utils.formationConfig = function(docs, unit) {
	if (unit.type == 'web') {
		docs.env.env.PORT = 8080;
	}

	return {
		reference : docs.app._id,
		type : unit.type,
		container : {
			logs : nconf.get('logs'),
			logSession : docs.app.logSession,
			metricSession : docs.app.metricSession,
			source : 'app',
			user : 'root',
			process : unit.type,
			channel : unit.type + '.' + unit.index,
			name : docs.app.organization.name + '.' + docs.app.name + '.' + unit.type,
			index : unit.index,
			env : docs.env.env,
			uid : uuid.v4(),
			username : docs.app.organization.name,
			size : unit.size,
			zones : docs.app.organization.quota.zones,
			image : 'registry.system.nodetopia.com/cedar:runner',
			ports : unit.type == 'web' ? ['8080/tcp'] : [],
			cmd : unit.cmd
		}
	};
};

utils.buildFormation = function(docs, cb) {

	var units = [];

	var containors = [];
	if (!docs.build) {
		return cb(null, [])
	}
	minioClient.presignedGetObject('tar', docs.build.build.path, 15 * 60, function(err, url) {
		if (err) {
			return cb(err)
		}
		async.parallel(docs.formation.commands.map(function(unit) {
			return function(next) {

				for (var i = 0; i < unit.quantity; i++) {
					units.push({
						size : unit.size || docs.app.organization.quota.plan.size,
						cmd : ['/run.sh', unit.type, url],
						type : unit.type,
						index : i
					});
				};
				next();

			};
		}), function() {
			async.parallel(units.map(function(unit) {
				return function(next) {
					next(null, utils.formationConfig(docs, unit));
				};
			}), cb);
		});
	});
};

utils.handleResponce = function() {
	var obj = {
		handle : function(errs, res, type) {
			if (errs) {
				if (Array.isArray(errs)) {
					obj.errors[type] = obj.errors[type].concat(errs);
				} else {
					obj.errors[type].push(errs);
				}
			}
			if (res) {
				if (Array.isArray(res)) {
					res.forEach(function(result) {
						if (result) {
							obj.results[type].push(result);
						}
					});

				} else {
					obj.results[type].push(res);
				}
			}
		},
		stop : function(e, r) {
			obj.handle(e, r, 'stopped');
		},
		start : function(e, r) {
			obj.handle(e, r, 'started');
		},
		errors : {
			stopped : [],
			started : []
		},
		results : {
			stopped : [],
			started : []
		}
	};

	return obj;
};

var nconf = require('nconf');

nconf.file({
	file : require('path').resolve(process.argv[2])
});
nconf.env();

require('./allocate-resources');
require('./app-deploy');
require('./app-scale');
require('./container-restart');
require('./container-start');
require('./container-stop');
require('./event-crash-stop');
require('./event-ports');
require('./io'); 
const Jerkie = require('jerkie');

let jerkie = new Jerkie({
    redis: process.env.REDIS_URI
});

function config(i) {
    var containerConfig = {
        reference: '5b135425c45cee080beec719',
        type: 'addon',
        exclude: ['node-02'],
        container: {
            logSession: 'logSession',
            metricSession: 'metricSession',
            user: 'root',
            source: 'redis',
            process: 'addon',
            channel: 'redis.' + i || 0,
            name: 'flybyme.someapp.redis',
            index: i || 0,
            env: {
                REDIS_PASS: 'other-password'
            },
            stats: {
                host: '127.0.0.1', port: 8125
            },
            "logs": {
                "web": {
                    "port": 5000,
                    "host": "51.15.225.81"
                },
                "udp": {
                    "port": 5001,
                    "host": "51.15.225.81"
                },
                "view": {
                    "port": 5000,
                    "host": "51.15.225.81"
                }
            },
            username: 'flybyme',
            size: {
                "io": {
                    "bandwidth": 10,
                    "iops": 10
                },
                "system": false,
                "dedicated": false,
                "type": "1S",
                "memory": 64,
                "memoryReservation": 48,
                "cpu": 50,
                "oomKillDisable": true
            },
            zones: [{
                name: 'par1'
            }],
            exclude: ['tutum/redis'],
            image: 'tutum/redis',
            ports: ['6379/tcp']
        }
    };
    return containerConfig;
}

function configNew(i) {
    var containerConfig = {
        reference: '5b135425c45cee080beec719',
        exclude: ['node-02'],

        logSession: 'logSession',
        metricSession: 'metricSession',

        organization: 'flybyme',
        application: 'someapp',
        type: 'addon',
        source: 'redis',
        index: i || 0,

        env: {
            REDIS_PASS: 'other-password'
        },

        size: {
            "io": {
                "bandwidth": 10,
                "iops": 10
            },
            "system": false,
            "dedicated": false,
            "type": "1S",
            "memory": 64,
            "memoryReservation": 48,
            "cpu": 50,
            "oomKillDisable": true
        },

        zones: [{
            name: 'par1'
        }],
        clean: false,
        image: 'tutum/redis',
        ports: ['6379/tcp']

    };
    return containerConfig;
}
function configNewStress(i) {
    var containerConfig = {
        reference: '5b135425c45cee080beec719',
        exclude: ['node-02'],

        logSession: 'logSession',
        metricSession: 'metricSession',

        organization: 'flybyme',
        application: 'someapp',
        type: 'addon',
        source: 'stress',
        index: i || 0,

        env: {
            REDIS_PASS: 'other-password'
        },

        size: {
            "io": {
                "bandwidth": 10,
                "iops": 10
            },
            "system": false,
            "dedicated": false,
            "type": "1S",
            "memory": 256,
            "memoryReservation": 48,
            "cpu": 50,
            "oomKillDisable": true
        },

        zones: [{
            name: 'par1'
        }],
        clean: false,
        image: 'polinux/stress',
        cmd: 'stress --cpu 1 --io 1 --vm 1 --vm-bytes 128M --timeout 1000s --verbose',
        ports: []

    };
    return containerConfig;
}

async function start() {
    console.log((await jerkie.call('fleet.container.start', configNewStress(2))).config);
}

start()
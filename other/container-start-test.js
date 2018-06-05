const Jerkie = require('../../Jerkie/index');

let jerkie = new Jerkie({
    redis: process.env.REDIS_URI
});
let index = 0;


function config(i) {
    var containerConfig = {
        reference: '5b135425c45cee080beec719',
        type: 'addon',
        container: {
            logSession: 'logSession',
            metricSession: 'metricSession',
            user: 'root',
            source: 'redis',
            process: 'addon',
            channel: 'redis.' + i||0,
            name: 'flybyme.someapp.redis',
            index: i||0,
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


async function start(count) {
    let p = [];
    let container;

    if (Number.isInteger(count)) {
        for (let i = 0; i < count; i++) {
            p.push(jerkie.call('fleet.container.start', config(i)))
        }
        container = await Promise.all(p)
    } else {
        container = await jerkie.call('fleet.container.start', config())
    }

    console.log(container)


}

async function stop(id) {
    console.log(await jerkie.call('fleet.container.stop', {id: id || '5b15b2998f372f2fb105b6ee'}))
    //start()

}

async function move(id, node) {
    console.log(await jerkie.call('fleet.container.move', {id: id || '5b15b2998f372f2fb105b6ee', node: node}))


}

//stop('5b15b8d5e9f2603fb24fd1d6')
//move('5b16a24b6d86a87a338b27b3', 'node-01')
start(5)

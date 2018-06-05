const Jerkie = require('../../Jerkie/index');

let jerkie = new Jerkie({
    redis: process.env.REDIS_URI
});

async function evict(node) {
    console.log(await jerkie.call('fleet.node.evict', {node: node}))


}

evict('node-02')
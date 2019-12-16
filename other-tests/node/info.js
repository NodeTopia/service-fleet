const Jerkie = require('jerkie');

let jerkie = new Jerkie({
    redis: process.env.REDIS_URI
});

async function infoAll() {
    console.log(await jerkie.call('fleet.node.info.all'));
}

async function infoName() {
    console.log(await jerkie.call('fleet.node.info.name', {node: 'test'}));
}
async function infoID() {
    console.log(await jerkie.call('fleet.node.info.id', {node: '5bcc98d8b945525ef9aeb909'}));
}

infoAll();
infoName();
infoID();
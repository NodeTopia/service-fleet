module.exports = function (socket) {
    let ctx = this;
    let schema = ctx.schema;


    schema.Node.findOne({
        socketId: socket.id
    }, function (err, node) {
        if (err)
            return ctx.broadcast('fleet.error', err);

        if (!node) {
            return ctx.broadcast('fleet.error', new Error('Node not found for exit'));
        }
        node.is_active = false;
        node.save(function () {
            ctx.broadcast('fleet.node.disconnect', node);
        });
    });


}
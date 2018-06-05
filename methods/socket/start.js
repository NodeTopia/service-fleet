module.exports = function (socket, container) {
    return new Promise(function (resolve, reject) {
        socket.emit('start', container, function (err, con) {
            if (err) {
                reject(err);
            } else {
                resolve(con);
            }
        })
    })
}
module.exports = function (container) {
    let state = container.state.toLocaleLowerCase()
    console.log('State changed to: ' + state + '	' + container.config.name + '.' + container.config.index);
    this.broadcast('fleet.state.' + state, container);
}
module.exports = function (container) {
    let state = container.state.toLocaleLowerCase();
    let uid = container.uid;
    //console.log('State changed to: ' + state + '	' + container.config.name + '.' + container.config.index);
    this.broadcast(`fleet.state.${state}`, uid);
    this.broadcast(`fleet.state.${state}.${uid}`, container);
}
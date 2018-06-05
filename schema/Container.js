const Jerkie = require('jerkie');

var mongoose = Jerkie.mongoose;
var Schema = mongoose.Schema;

var ContainerSchema = new Schema({
    created_at : {
        type : Date,
        required : true,
        'default' : Date.now
    },
    updated_at : {
        type : Date,
        'default' : Date.now
    },
    stopped_at : {
        type : Date
    },
    is_restart : {
        type : Boolean,
        'default' : false
    },
    restartable : {
        type : Boolean,
        'default' : true
    },
    is_stopping : {
        type : Boolean,
        'default' : false
    },
    evicted : {
        type : Boolean,
        'default' : false
    },
    evicted_at : {
        type : Date
    },
    statusCode : {
        type : Number
    },
    shortLived : {
        type : Boolean
    },
    reference : {
        type : Schema.ObjectId
    },
    quota : {
        type : Schema.ObjectId
    },
    node : {
        type : Schema.ObjectId
    },
    id : {
        type : String
    },
    index : {
        type : Number
    },
    state : {
        type : String
    },
    type : {
        type : String
    },
    name : {
        type : String
    },
    uid : {
        type : String
    },
    ports : [{
        forward : String,
        port : Number,
        ip : String
    }],
    env : {

    },
    image : {
        type : String
    },
    logSession : {
        type : String
    },
    metricSession : {
        type : String
    },
    logs : {
        web : {
            host : String,
            port : Number
        },
        udp : {
            host : String,
            port : Number
        }
    },
    config : Schema.Types.Mixed
});

ContainerSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});
module.exports = mongoose.model('Container', ContainerSchema);
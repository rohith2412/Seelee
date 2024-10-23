const mongoose = require('mongoose');
const dbgr = require('debug')("development:mongoose");
const config = require('config');

const mongoURI = process.env.MONGODB_URI || config.get("MONGODB_URI");

mongoose
    .connect(`${mongoURI}/failed`, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(function() {
        dbgr("connected");
    })
    .catch(function(err) {
        dbgr(err);
    });

module.exports = mongoose.connection;

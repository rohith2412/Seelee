const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
    ownerName: {
        type: String,
        required: true 
    },
    email: {
        type: String,
        required: true 
    },
    password: {
        type: String,
        required: true 
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product' 
    }],
    picture: String
});

module.exports = mongoose.model("Owner", ownerSchema);

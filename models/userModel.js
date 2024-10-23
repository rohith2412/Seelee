const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: String,
    email: String,
    password: String,
    cart: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",  
        }
    ],
    orders: {
        type: Array,
        default: []
    },
});

module.exports = mongoose.model("User", userSchema); 

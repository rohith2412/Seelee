const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
        product: {
            name: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            },
        },
        picture: {
            type: Buffer, 
            required: true
        }
    }, 
    {
        timestamps: true
    });

module.exports = mongoose.model("Product", productSchema); // Make sure this is 'Product'

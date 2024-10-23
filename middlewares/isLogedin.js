const jwt = require('jsonwebtoken');
const userModel = require("../models/userModel");

module.exports = async (req, res, next) => {
    if (!req.cookies.token) {
        return res.status(401).redirect("/login"); 
    }

    try {
        const decodedToken = jwt.verify(req.cookies.token, process.env.JWT_KEY);
        const user = await userModel.findOne({ email: decodedToken.email }).select("-password");

        if (!user) {
            return res.status(404).redirect("/login"); 
        }

        req.user = user; 
        next(); 
    } catch (err) {
        console.error("Token verification failed:", err);
        return res.status(401).redirect("/login"); 
    }
}
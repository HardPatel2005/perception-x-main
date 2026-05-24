const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const authenticate = async (req, res , next) => {
    try{
        const authHeader = req.headers.authorization;

        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return res.status(401).json({error : "No token provided , authorization denied"} );

        }
        const token = authHeader.substring(7);

        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.userId).select("-password");

        if (!user){
            return res.status(401).json({error : "User not found , authorization denied"})
        }

        req.user = user;
        next();


    }catch(error){
        if(error.name === "JsonWebTokenError"){
            return res.status(401).json({error : "Invalid token"});
        }
        if(error.name === "TokenExpiredError"){
            return res.status(401).json({error : "Token Expired"});
        }
        console.error("Auth Middleware error:", error);
        return res.status(500).json({error : "Server error"});
    }
};

const generateToken = (userId) => {
    return jwt.sign(
        {userId},
        JWT_SECRET,
        {expiresIn : "1h"}
    );

};


module.exports = {authenticate, generateToken};
const express = require('express');
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { generateToken, authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/signup",
    [
        body("username")
            .trim()
            .isLength({ min: 3, max: 30 })
            .withMessage("Username must be between 3 and 30 characters long")
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage("Username can only contain letters, numbers, and underscores"),

        body("email")
            .isEmail()
            .normalizeEmail()
            .withMessage("Please provide a valid email address"),

        body("password")
            .isLength({ min: 8 })
            .withMessage("Password must be at least 8 characters long")
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: "Validation Failed",
                    details: errors.array()
                });
            }

            const { username, email, password } = req.body;

            const existingUser = await User.findOne({
                $or: [{ email }, { username }]
            });

           if(existingUser){
            return res.status(400).json({
                error: "User already exists",
                field: existingUser.email === email ? "email" : "username"
            });
           }

           const user = new User({ username, email, password });

            await user.save();

            const token = generateToken(user._id);

            res.status(201).json({
                success: true,
                token,
                message: "User registered successfully",
                user: {
                    id: user._id, username: user.username, email: user.email
                }
            });

        }catch(error){
            console.error("Signup error:", error);
            
            if(error.code === 11000) {
                const field = Object.keys(error.keyValue)[0]; 
                return res.status(400).json({ error: `${field} value already exists`, field });
            }

            res.status(500).json({ error: "Server error" });
        }
    }
);

router.post("/login",
    [
        body("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Please provide a valid email address"),

        body("password")
        .notEmpty()
        .withMessage("Password is required")
    ],
    async(req, res) => {
        try{
            const errors = validationResult(req);
            if(!errors.isEmpty()){
                return res.status(400).json({
                    error: "Validation Failed",
                    details : errors.array()

                });
            }

            const {email, password} = req.body;

            const user = await User.findOne({email});

            if(!user) {
                return res.status(400).json({error: "Invalid email or password"});
            }

            const isMatch = await user.comparePassword(password);
            if(!isMatch){
                return res.status(400).json({error: "Invalid email or password"});
            }

            const token = generateToken(user._id);

            res.json({
                success: true,
                message: "Login Successful",
                token,
                user : {
                    id : user._id,
                    username : user.username,
                     email : user.email,
                     createdAt : user.createdAt

                }
            })

        }catch(error){
            console.error("Login error:", error);
             res.status(500).json({error : "Server error"});    

        }
    }
);

router.get("/me", authenticate, async (req, res)=> {
    try {
        res.json({
            success:true,
            user:{
                id: req.user._id,
                username:req.user.username,
                email:req.user.email,
                createdAt:req.user.createdAt
            }
        });
    }catch(error) {
        console.error("Get user error:", error);
        res.status(500).json({error : "Server error"});

    }
});

router.post("/verify",authenticate,  async(req, res)=> {
   res.json({
    success:true,
    message: "Token is valid",
    user : {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
    }
   });
});

module.exports = router;
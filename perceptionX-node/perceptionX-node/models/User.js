const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: [3, "Username must be at least 3 characters long"],
        maxlength: [30, "Username cannot exceed 30 characters"]
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
    },
    password: {
        type: String,
        required: true,
        minlength: [8, "Password must be at least 8 characters long"],
    
    },
    createdAt: {
        type: Date, 
        default: Date.now

    }
})

userSchema.pre("save", async function(next) {
    if (!this.isModified("password"))  return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password =  await bcrypt.hash(this.password, salt);
        next();

    }catch(error){
        next(error);
    }
})

userSchema.methods.comparePassword =  async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password)
};

module.exports = mongoose.model("User", userSchema)
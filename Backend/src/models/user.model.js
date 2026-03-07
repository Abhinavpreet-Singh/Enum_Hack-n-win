import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        trim: true,
        required: true,
    },
    refreshToken: {
        type: String,
    },
    displayName: {
        type: String,
        trim: true,
    },
    bio: {
        type: String,
        trim: true,
        default: "",
    },
    college: {
        type: String,
        trim: true,
        default: "",
    },
    role: {
        type: String,
        trim: true,
        default: "Student",
    },
    location: {
        type: String,
        trim: true,
        default: "",
    },
    resume: {
        type: String,
        trim: true,
        default: "",
    },
    skills: {
        type: [String],
        default: [],
    },
    links: {
        github: { type: String, trim: true, default: "" },
        linkedin: { type: String, trim: true, default: "" },
        website: { type: String, trim: true, default: "" },
    },
    certs: {
        type: [
            {
                name: { type: String, trim: true },
                issuer: { type: String, trim: true },
                date: { type: String, trim: true },
                done: { type: Boolean, default: false },
            },
        ],
        default: [],
    },
    avatar: {
        type: String,
        trim: true,
        default: "",
    },
});

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

export const User = mongoose.model("User", userSchema);

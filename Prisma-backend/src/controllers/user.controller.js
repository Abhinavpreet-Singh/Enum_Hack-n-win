import { asyncHandler } from "../utils/asyncHandler.js";
import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { uploadAvatarToCloudinary } from "../utils/cloudinary.js";

const generateAccessToken = (user) => {
    return jwt.sign(
        {
            _id: user.id,
            email: user.email,
            username: user.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            _id: user.id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        await prisma.user.update({
            where: { id: userId },
            data: { refreshToken },
        });

        return { refreshToken, accessToken };
    } catch (error) {
        throw new ApiError(
            500,
            `Something went wrong while generating the tokens!! ${error}`
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if ([username, email, password].some((fields) => fields.trim() === "")) {
        throw new ApiError(400, "All fields are required.");
    }

    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [{ username: username.toLowerCase() }, { email }],
        },
    });

    if (existingUser) {
        throw new ApiError(409, "User already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            username: username.toLowerCase(),
        },
        omit: { password: true, refreshToken: true },
    });

    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering user!!"
        );
    }

    return res.status(201).json({
        message: "Registration Successfull",
        data: createdUser,
    });
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!email && !username) {
        throw new ApiError(400, "Email or username is required");
    }

    if (!password) {
        throw new ApiError(400, "password required");
    }

    const user = await prisma.user.findFirst({
        where: {
            OR: [
                ...(username ? [{ username }] : []),
                ...(email ? [{ email }] : []),
            ],
        },
    });

    if (!user) {
        throw new ApiError(404, "User not found please register first!!");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid Password!!");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
        user.id
    );

    const loggedInUser = await prisma.user.findUnique({
        where: { id: user.id },
        omit: { password: true, refreshToken: true },
    });

    if (!loggedInUser) {
        throw new ApiError(
            500,
            "Something went wrong while logging the user!!"
        );
    }

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json({
            message: "Logged In",
            data: loggedInUser,
            accessToken: accessToken,
        });
});

const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(404, "User Id not found");
    }

    const user = await prisma.user.findUnique({
        where: { id },
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json({
        message: "data fetched",
        data: user,
    });
});

const logoutUser = asyncHandler(async (req, res) => {
    await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null },
    });

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json({
            message: "Logged out successfully",
        });
});

const userForgetPassword = asyncHandler(async (req, res) => {
    const { email, username, newPassword } = req.body;

    if (!email && !username) {
        throw new ApiError(400, "Email or username is required!!");
    }

    if (!newPassword) {
        throw new ApiError(404, "New password is required!!");
    }

    const user = await prisma.user.findFirst({
        where: {
            OR: [
                ...(username ? [{ username }] : []),
                ...(email ? [{ email }] : []),
            ],
        },
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const existedUser = await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
    });

    return res.status(200).json({
        message: "Password changed",
        data: existedUser,
    });
});

const getProfile = asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        omit: { password: true, refreshToken: true },
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json({
        message: "Profile fetched",
        data: user,
    });
});

const updateProfile = asyncHandler(async (req, res) => {
    const allowedFields = [
        "displayName",
        "bio",
        "college",
        "role",
        "location",
        "resume",
        "skills",
        "links",
        "certs",
    ];
    const updateFields = {};

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updateFields[field] = req.body[field];
        }
    }

    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: updateFields,
        omit: { password: true, refreshToken: true },
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json({
        message: "Profile updated",
        data: user,
    });
});

const uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "No image file provided");
    }

    const { url } = await uploadAvatarToCloudinary(
        req.file.buffer,
        req.user.id
    );

    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { avatar: url },
        omit: { password: true, refreshToken: true },
    });

    return res.status(200).json({
        message: "Avatar updated",
        data: { avatar: user.avatar },
    });
});

const getLeaderboard = asyncHandler(async (req, res) => {
    // 1. Get all accepted submissions grouped by user + question
    const acceptedSubmissions = await prisma.submission.findMany({
        where: { verdict: "accepted" },
        select: {
            userId: true,
            questionId: true,
            question: { select: { level: true } },
        },
        distinct: ["userId", "questionId"],
    });

    // Build per-user problem XP
    const userProblemMap = {};
    for (const sub of acceptedSubmissions) {
        if (!userProblemMap[sub.userId]) {
            userProblemMap[sub.userId] = { problemXP: 0, problemsSolved: 0 };
        }
        const xp = sub.question.level === "Easy" ? 10
            : sub.question.level === "Medium" ? 25
            : sub.question.level === "Hard" ? 50 : 10;
        userProblemMap[sub.userId].problemXP += xp;
        userProblemMap[sub.userId].problemsSolved += 1;
    }

    // 2. Get all solved simulations
    const solvedSimulations = await prisma.userSimulationProgress.findMany({
        where: { solved: true },
        select: {
            userId: true,
            simulation: { select: { xpReward: true, difficulty: true } },
        },
    });

    const userSimMap = {};
    for (const sp of solvedSimulations) {
        if (!userSimMap[sp.userId]) {
            userSimMap[sp.userId] = { simulationsSolved: 0, simulationXP: 0 };
        }
        let simXP = sp.simulation.xpReward || 0;
        if (simXP === 0) {
            simXP = sp.simulation.difficulty === "easy" ? 50
                : sp.simulation.difficulty === "medium" ? 100
                : sp.simulation.difficulty === "hard" ? 150 : 50;
        }
        userSimMap[sp.userId].simulationsSolved += 1;
        userSimMap[sp.userId].simulationXP += simXP;
    }

    // 3. All users
    const users = await prisma.user.findMany({
        select: { id: true, username: true, displayName: true, avatar: true },
    });

    const leaderboard = users
        .map((user) => {
            const sq = userProblemMap[user.id];
            const ss = userSimMap[user.id];
            return {
                _id: user.id,
                username: user.username,
                displayName: user.displayName || user.username,
                avatar: user.avatar || "",
                xp: (sq?.problemXP ?? 0) + (ss?.simulationXP ?? 0),
                problemsSolved: sq?.problemsSolved ?? 0,
                simulationsSolved: ss?.simulationsSolved ?? 0,
            };
        })
        .sort((a, b) => b.xp - a.xp);

    return res
        .status(200)
        .json({ message: "Leaderboard fetched", data: leaderboard });
});

export {
    registerUser,
    loginUser,
    logoutUser,
    userForgetPassword,
    getUserById,
    getProfile,
    updateProfile,
    uploadAvatar,
    getLeaderboard,
};

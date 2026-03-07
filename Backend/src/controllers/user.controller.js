import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import bcrypt from "bcrypt";
import { uploadAvatarToCloudinary } from "../utils/cloudinary.js";
import { Submission } from "../models/submission.model.js";
import { UserSimulationProgress } from "../models/userSimulationProgress.model.js";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({ validateBeforeSave: false });

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

    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existingUser) {
        throw new ApiError(409, "User already exists.");
    }

    const user = await User.create({
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findOne(user._id).select(
        "-password -refreshToken"
    );

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
    // check for empty fields
    // check if user has registered or not
    // generate tokens

    const { email, username, password } = req.body;

    if (!email && !username) {
        throw new ApiError(400, "Email or username is required");
    }

    if (!password) {
        throw new ApiError(400, "password required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(404, "User not found please register first!!");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid Password!!");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

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

    const user = await User.findById(id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json({
        message: "data fetched",
        data: user,
    });
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            returnDocument: "after",
        }
    );

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
    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const existedUser = await User.findByIdAndUpdate(
        user._id,
        {
            $set: {
                password: hashedPassword,
            },
        },
        {
            returnDocument: "after",
        }
    );

    return res.status(200).json({
        message: "Password changed",
        data: existedUser,
    });
});

const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select(
        "-password -refreshToken"
    );

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

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateFields },
        { new: true, runValidators: true }
    ).select("-password -refreshToken");

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
        req.user._id.toString()
    );

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: url } },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json({
        message: "Avatar updated",
        data: { avatar: user.avatar },
    });
});

const getLeaderboard = asyncHandler(async (req, res) => {
    // 1. Unique solved questions per user with difficulty XP
    const solvedQuestions = await Submission.aggregate([
        { $match: { verdict: "accepted" } },
        // one entry per (user, question) pair
        { $group: { _id: { user: "$user", question: "$question" } } },
        {
            $lookup: {
                from: "questions",
                localField: "_id.question",
                foreignField: "_id",
                as: "q",
            },
        },
        { $unwind: { path: "$q", preserveNullAndEmptyArrays: false } },
        {
            $addFields: {
                xp: {
                    $switch: {
                        branches: [
                            { case: { $eq: ["$q.level", "Easy"] }, then: 10 },
                            { case: { $eq: ["$q.level", "Medium"] }, then: 25 },
                            { case: { $eq: ["$q.level", "Hard"] }, then: 50 },
                        ],
                        default: 10,
                    },
                },
            },
        },
        {
            $group: {
                _id: "$_id.user",
                problemXP: { $sum: "$xp" },
                problemsSolved: { $sum: 1 },
            },
        },
    ]);

    // 2. Completed simulations per user — XP from simulation's xpReward field
    //    (fallback: easy=50, medium=100, hard=150 if xpReward is not set)
    const solvedSimulations = await UserSimulationProgress.aggregate([
        { $match: { solved: true } },
        {
            $lookup: {
                from: "simulations",
                localField: "simulationId",
                foreignField: "_id",
                as: "sim",
            },
        },
        { $unwind: { path: "$sim", preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                simXP: {
                    $cond: [
                        { $gt: [{ $ifNull: ["$sim.xpReward", 0] }, 0] },
                        "$sim.xpReward",
                        {
                            $switch: {
                                branches: [
                                    {
                                        case: {
                                            $eq: ["$sim.difficulty", "easy"],
                                        },
                                        then: 50,
                                    },
                                    {
                                        case: {
                                            $eq: ["$sim.difficulty", "medium"],
                                        },
                                        then: 100,
                                    },
                                    {
                                        case: {
                                            $eq: ["$sim.difficulty", "hard"],
                                        },
                                        then: 150,
                                    },
                                ],
                                default: 50,
                            },
                        },
                    ],
                },
            },
        },
        {
            $group: {
                _id: "$userId",
                simulationsSolved: { $sum: 1 },
                simulationXP: { $sum: "$simXP" },
            },
        },
    ]);

    // 3. All users (everyone appears, new users start at 0 XP)
    const users = await User.find()
        .select("username displayName avatar")
        .lean();

    const sqMap = Object.fromEntries(
        solvedQuestions.map((s) => [s._id.toString(), s])
    );
    const ssMap = Object.fromEntries(
        solvedSimulations.map((s) => [s._id.toString(), s])
    );

    const leaderboard = users
        .map((user) => {
            const userId = user._id.toString();
            const sq = sqMap[userId];
            const ss = ssMap[userId];
            return {
                _id: userId,
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

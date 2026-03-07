import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req?.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized Request!!");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log(decodedToken);

        const user = await prisma.user.findUnique({
            where: { id: decodedToken._id },
            omit: { password: true, refreshToken: true },
        });

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;
        console.log(req.user);
        console.log(req.cookies);
        next();
    } catch (error) {
        throw new ApiError(401, "Invalid Access Token");
    }
});

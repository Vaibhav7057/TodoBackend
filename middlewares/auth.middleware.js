import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;

  // if (!authHeader?.startsWith("Bearer ")) {
  //   throw new ApiError(401, "Unauthorized request");
  // }

  const token = authHeader?.split(" ")[1] || req.cookies?.accessToken;

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  if (!decodedToken) throw new ApiError(403, "access token expired");

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(401, "Invalid Access Token");
  }

  req.user = user;
  next();
});

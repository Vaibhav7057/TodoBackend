import { asyncHandler } from "../utils/asyncHandler.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Todo } from "../models/todo.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { sendEmail } from "../utils/sendmail.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, monumber, password } = req.body;

  if ([fullName, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { monumber }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or mobile number already exists");
  }

  const user = await User.create({
    fullName,
    email,
    password,
    monumber,
  });

  if (!user) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, "user created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!password || !email) {
    throw new ApiError(400, "email and password is required");
  }
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new ApiError(404, "User does not exists");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const options = {
    httpOnly: true,
    secure: true,
    maxAge: 10 * 24 * 60 * 60 * 1000,
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "User logged In Successfully", "token", accessToken)
    );
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
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "Logged Out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    if (decodedToken.exp < Date.now() / 1000) {
      throw new ApiError(401, "refresh token has expired");
    }
    if (!decodedToken?._id) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const user = await User.findById(decodedToken?._id).select("+refreshToken");

    if (!user) {
      throw new ApiError(401, "Invalid user refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const accessToken = user.generateAccessToken();

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Access token refreshed", "token", accessToken)
      );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token or expired");
  }
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "email is required");
  }
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exists");
  }

  const resetOtp = user.passwordResetOtp();

  await user.save({ validateBeforeSave: false });

  const message = `Your password reset OTP is :- \n\n ${resetOtp} \n\nIf you have not requested this email then, please ignore it.`;

  try {
    await sendEmail({
      email: user.email,
      subject: `TodoList Password Recovery`,
      message,
    });

    res
      .status(200)
      .json(new ApiResponse(200, `Email sent to ${user.email} successfully`));
  } catch (error) {
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ApiError(500, error.message));
  }
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const { resetPasswordOtp, newPassword, confirmPassword } = req.body;
  if (!resetPasswordOtp || !newPassword || !confirmPassword) {
    throw new ApiError(400, "please enter OTP and new password");
  }

  const user = await User.findOne({
    $and: [{ resetPasswordOtp }, { resetPasswordExpire: { $gt: Date.now() } }],
  });

  if (!user) {
    throw new ApiError(
      400,
      "Reset Password OTP is invalid or has been expired"
    );
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Password does not match");
  }

  user.password = newPassword;
  user.resetPasswordOtp = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.json(new ApiResponse(200, "password reset successfully"));
});

const getUserDetails = asyncHandler(async (req, res, next) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "todos",
        localField: "_id",
        foreignField: "owner",
        as: "todos",
      },
    },
    {
      $addFields: {
        alltodos: "$todos",
      },
    },
    {
      $project: {
        _id: 1,
        email: 1,
        fullName: 1,
        monumber: 1,
        profilephoto: 1,
        alltodos: 1,
      },
    },
  ]);

  if (!user) {
    throw new ApiError(404, "user does not exists");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "here is your detail", "user", user[0]));
});

const updatePassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.json(new ApiError(400, "all fields are required"));
  }

  const user = await User.findById(req.user.id).select("+password");

  const isPasswordMatched = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordMatched) {
    throw new ApiError(400, "Old password is incorrect");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "new password is not same to confirm password");
  }

  user.password = newPassword;

  await user.save();

  res.json(new ApiResponse(200, "password updated successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email, monumber } = req.body;

  if (!fullName || !email || !monumber) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
        monumber,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Account details updated successfully", "user", user)
    );
});

const updatephoto = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { public_id } = req.body;

  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) throw new ApiError(404, "file not found");

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) throw new ApiError(404, "file not found on server");

  if (public_id) {
    await cloudinary.uploader.destroy(public_id);
  }
  let profilephoto = {
    public_id: avatar?.public_id || "",
    url: avatar?.secure_url || "",
  };

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { profilephoto: profilephoto } },
    {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    }
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "your profile photo has been updated successfully",
        "imgUrl",
        req.file
      )
    );
});

const deletephoto = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { public_id } = req.params;
  const response = await deleteFromCloudinary(public_id);
  if (response.result != "ok") throw new ApiError(404, "file deletion failed");

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { profilephoto: "" } },
    {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    }
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "your profile photo has been deleted successfully",
        "response",
        response
      )
    );
});

const deleteaccount = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { public_id } = req.query;
  if (public_id) {
    await cloudinary.uploader.destroy(public_id);
  }
  await Todo.deleteMany({ owner: userId });
  const updatedUser = await User.findByIdAndDelete(userId);
  if (!updatedUser) {
    throw new ApiError(401, "error occured while deleting your account");
  }

  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "your account has been deleted successfully"));
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  deleteaccount,
  updatePassword,
  updateAccountDetails,
  updatephoto,
  deletephoto,
  getUserDetails,
};

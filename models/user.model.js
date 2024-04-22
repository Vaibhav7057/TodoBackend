import mongoose, { Schema } from "mongoose";
import validator from "validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, "Please enter your Fullname"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Please enter email"],
      unique: true,
      lowecase: true,
      trim: true,
      validate: [validator.isEmail, "Please Enter a valid Email"],
    },
    monumber: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      unique: true,
      select: false,
    },

    profilephoto: {
      public_id: {
        type: String,
      },
      url: {
        type: String,
      },
    },

    todos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Todo",
      },
    ],

    refreshToken: {
      type: String,
      select: false,
    },
    resetPasswordOtp: {
      type: Number,
    },
    resetPasswordExpire: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
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
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
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

userSchema.methods.passwordResetOtp = function () {
  const resetOtp = Math.floor(Math.floor(100000 + Math.random() * 900000));

  this.resetPasswordExpire = Date.now() + 5 * 60 * 1000;
  this.resetPasswordOtp = resetOtp;

  return resetOtp;
};

export const User = mongoose.model("User", userSchema);

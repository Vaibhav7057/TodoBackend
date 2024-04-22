import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const dbconnection = await mongoose.connect(`${process.env.MONGODB_URI}`);
    console.log(
      `\n MongoDB connected !! DB HOST: ${dbconnection.connection.host}`
    );
  } catch (error) {
    console.log("MONGODB connection FAILED ", error.message);
    process.exit(1);
  }
};

export default connectDB;

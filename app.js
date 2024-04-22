import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import handleError from "./middlewares/error.js";
import { ApiResponse } from "./utils/ApiResponse.js";
import { ApiError } from "./utils/ApiError.js";

const app = express();

app.set("view engine", "ejs");
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.get("/", (req, res) => {
  res.status(200);
  if (req.accepts("html")) {
    res.render("index");
  } else if (req.accepts("json")) {
    res.json(new ApiResponse(200, "This is the best site for shopping"));
  } else {
    res.type("txt").send("This is the best site for shopping");
  }
});

import userRouter from "./routes/user.routes.js";
import todosRouter from "./routes/todos.routes.js";

app.use("/api/user", userRouter);
app.use("/api/todos", todosRouter);

app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.render("pagenotfound");
  } else if (req.accepts("json")) {
    throw new ApiError(500, "404 page not found");
  } else {
    res.type("txt").send("404 Not Found");
  }
});

app.use(handleError);
export default app;

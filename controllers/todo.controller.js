import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Todo } from "../models/todo.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const addtodo = asyncHandler(async (req, res) => {
  const { title, description, deadline } = req.body;
  if (!title) throw new ApiError(401, "title field is requied");
  const existedTodo = await Todo.findOne({ title });

  if (existedTodo) {
    throw new ApiError(409, `Todo with title '${title}' already exists`);
  }

  const todo = await Todo.create({
    title,
    description,
    deadline,
    owner: req.user._id,
  });
  if (!todo) throw new ApiError(501, "internal server error");

  return res
    .status(201)
    .json(new ApiResponse(201, "todo created successfully"));
});

const removetodo = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const deletedtodo = await Todo.findByIdAndDelete(id);
  if (!deletedtodo) throw new ApiError(500, "Something went wrong in server");

  return res.json(
    new ApiResponse(
      200,
      "your todo was deleted successfully!",
      "deletedTodo",
      deletedtodo
    )
  );
});

const findsingletodo = asyncHandler(async (req, res) => {
  const id = req.params.id;

  const singleTodo = await Todo.findById(id);
  if (!singleTodo) throw new ApiError(404, "todo not found");

  return res.json(
    new ApiResponse(200, "here is your todo!", "todo", singleTodo)
  );
});

const findtodo = asyncHandler(async (req, res) => {
  const userid = req.user._id;
  const { limit, skip } = req.query;
  const alltodos = await Todo.find({ owner: userid }).skip(skip).limit(limit);
  const numberOfTodos = await Todo.find({ owner: userid }).countDocuments();

  if (!alltodos) {
    throw new ApiError(404, "you are not a valid user");
  }
  const newResponse = new ApiResponse(
    200,
    "here are your todos!",
    "todos",
    alltodos
  );
  newResponse.numberOfTodos = numberOfTodos;
  res.status(200).json(newResponse);
});

const searchtodo = asyncHandler(async (req, res) => {
  const userid = req.user._id;
  const { limit, skip, searchkey } = req.query;
  const alltodos = await Todo.find({
    $and: [
      { owner: userid },
      { title: { $regex: new RegExp(searchkey, "i") } },
    ],
  })
    .skip(skip)
    .limit(limit);
  const numberOfTodos = await Todo.find({
    $and: [
      { owner: userid },
      { title: { $regex: new RegExp(searchkey, "i") } },
    ],
  }).countDocuments();

  if (!alltodos) {
    throw new ApiError(404, "you are not a valid user");
  }
  const newResponse = new ApiResponse(
    200,
    "here are your todos!",
    "todos",
    alltodos
  );
  newResponse.numberOfTodos = numberOfTodos;
  res.status(200).json(newResponse);
});

const updatetodo = asyncHandler(async (req, res) => {
  const { title, description, deadline } = req.body;
  const updatedtodo = await Todo.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        title,
        description,
        deadline,
      },
    },
    {
      new: true,
      // runValidators: true,
      // useFindAndModify: false,
    }
  );
  if (!updatedtodo)
    throw new ApiError(501, "Something went wrong while updating todo");
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "todo updated successfully",
        "updatedtodo",
        updatedtodo
      )
    );
});

const updatetodostatus = asyncHandler(async (req, res) => {
  const { completed } = req.body;

  const updatedtodo = await Todo.findByIdAndUpdate(
    req.params.id,
    { $set: { completed } },
    {
      new: true,
    }
  );
  if (!updatedtodo)
    throw new ApiError(501, "Something went wrong while updating todo");
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "todo status updated successfully",
        "updatedtodo",
        updatedtodo
      )
    );
});

export {
  addtodo,
  removetodo,
  findtodo,
  searchtodo,
  findsingletodo,
  updatetodo,
  updatetodostatus,
};

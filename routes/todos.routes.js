import { Router } from "express";
import {
  addtodo,
  removetodo,
  findtodo,
  searchtodo,
  findsingletodo,
  updatetodo,
  updatetodostatus,
} from "../controllers/todo.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/createtodo").post(verifyJWT, addtodo);
router.route("/deletetodo/:id").delete(verifyJWT, removetodo);
router.route("/getsingletodo/:id").get(verifyJWT, findsingletodo);
router.route("/getalltodos").get(verifyJWT, findtodo);
router.route("/searchtodos").get(verifyJWT, searchtodo);
router.route("/edittodo/:id").put(verifyJWT, updatetodo);
router.route("/editstatus/:id").put(verifyJWT, updatetodostatus);

export default router;

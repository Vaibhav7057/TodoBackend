import { Router } from "express";
import {
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
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);

router.route("/login").post(loginUser);

router.route("/refresh").get(refreshAccessToken);

router.route("/logout").get(verifyJWT, logoutUser);

router.route("/password/forgot").post(forgotPassword);

router.route("/password/reset").post(resetPassword);
router.route("/deleteaccount").delete(verifyJWT, deleteaccount);

router.route("/password/update").patch(verifyJWT, updatePassword);
router.route("/me/update").patch(verifyJWT, updateAccountDetails);
router
  .route("/updateprofilephoto")
  .post(verifyJWT, upload.single("profilephoto"), updatephoto);
router.route("/deleteprofilephoto").post(verifyJWT, deletephoto);

router.route("/me").get(verifyJWT, getUserDetails);

export default router;

import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, Math.round(Math.random() * 1e9) + file.originalname);
  },
});

export const upload = multer({
  storage,
});

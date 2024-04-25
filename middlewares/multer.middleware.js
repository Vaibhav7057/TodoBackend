import multer from "multer";

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, `${Math.round(Math.random() * 1e9)}__${file.originalname}`);
  },
});

export const upload = multer({
  storage,
});

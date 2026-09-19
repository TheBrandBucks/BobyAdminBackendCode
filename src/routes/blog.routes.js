import { Router } from "express";

import {
  addBlog,
  blogsList,
  // getSingleBlog,
  deleteSingleBlog,
  getSingleBlog,
  updateBlogDetails
} from "../Controllers/blog.controller.js";


import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Create new blog (secure - admin only)
router.route("/addBlog").post(
  verifyJWT,
  upload.fields([
    {
      name: "image", // frontend pe bhi "image" hi hona chahiye
      maxCount: 1,
    },
  ]),
  addBlog
);

// Get all blogs (anyone can access)
router.route("/blogs-list").get(blogsList);

// Get single blog by id
router.route("/single-blog/:blogId").get(getSingleBlog);

// Delete blog (secure - admin only)
router.route("/delete-blog/:blogId").delete(
  verifyJWT,
  deleteSingleBlog);

// Update blog (secure - admin only)
router.route("/update-blog/:blogId").patch(
  verifyJWT,
  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
  ]),
  updateBlogDetails
);

export default router;

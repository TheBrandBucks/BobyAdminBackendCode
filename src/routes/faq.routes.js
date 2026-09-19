import { Router } from "express";


import {
  addFaq,
  faqsList,
  // getSingleBlog,
  deleteSingleFaq,
  updateFaqDetails
} from "../Controllers/faq.controller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Create new Faq (secure - admin only)
router.route("/addFaq").post(
  verifyJWT,
  addFaq
);

// Get all faqs (anyone can access)
router.route("/faqs-list").get(faqsList);

// Get single faq by id
// router.route("/single-blog/:blogId").get(getSingleBlog);

// Delete faq (secure - admin only)
router.route("/delete-faq/:faqId").delete(
  verifyJWT,
  deleteSingleFaq);

// Update faq (secure - admin only)
router.route("/update-faq/:faqId").patch(
  verifyJWT,

  updateFaqDetails
);

export default router;

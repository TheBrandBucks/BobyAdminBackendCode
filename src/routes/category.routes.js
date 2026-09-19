import { Router } from "express";
import {
  addCategory,
  categoriesList,
  deleteCategory,
} from "../Controllers/category.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/categories-list").get(categoriesList);
router.route("/add-category").post(verifyJWT, addCategory);
router.route("/delete-category/:categoryId").delete(verifyJWT, deleteCategory);

export default router;
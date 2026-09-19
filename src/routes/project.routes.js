import { Router } from "express";

import {
  addProject,
  projectsList,
  // getSingleProject,
  deleteSingleProject,
  updateProjectDetails
} from "../Controllers/project.controller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Create new project (secure - admin only)
router.route("/addProject").post(
  verifyJWT,
  upload.fields([
    {
      name: "images", // frontend pe bhi "image" field hi bhejna hoga
      maxCount: 10,
    },
  ]),
  addProject
);

// Get all projects (public)
router.route("/projects-list").get(projectsList);

// Get single project by id (public)
// router.route("/single-project/:projectId").get(getSingleProject);

// Delete project (secure - admin only)
router.route("/delete-project/:projectId").delete(
  verifyJWT,
  deleteSingleProject);

// Update project (secure - admin only)
router.route("/update-project/:projectId").patch(
  verifyJWT,
  upload.fields([
    {
      name: "images",
      maxCount: 10,
    },
  ]),
  updateProjectDetails
);

export default router;

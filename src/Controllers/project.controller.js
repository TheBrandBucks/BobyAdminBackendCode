import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/APIErrorStandarize.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/APIRespStandarize.js";
import { prisma } from "../config/prismaClient.js";
/* ---------------------- Add Project ---------------------- */
const addProject = AsyncHandler(async (req, res) => {
  const { client, industry, challenge, solution, results } = req.body;
  const userId = req.user?.id; // assuming JWT auth middleware adds req.user
  console.log("Project from frontend:", req.body)
  // Validation
  if ([client, industry, challenge, solution].some((f) => !f?.trim())) {
    throw new ApiError(400, "All required fields must be filled");
  }

  //Check duplicate project
  const existingProject = await prisma.project.findFirst({
    where: { client: client.trim() },
  });
  if (existingProject) {
    throw new ApiError(409, "Project with this client name already exists");
  }

  // --- Image uploads ---
  const imageFiles = req.files?.images || [];
  if (!imageFiles.length) {
    throw new ApiError(400, "At least one project image is required");
  }

  // Upload all images to Cloudinary
  const uploadedImages = await Promise.all(
    imageFiles.map(async (file) => {
      const result = await uploadOnCloudinary(file.path);
      return result?.url;
    })
  );

  // Check uploads
  if (!uploadedImages.length) {
    throw new ApiError(400, "Image upload failed");
  }

  // Parse results JSON or array
  let formattedResults = [];

  try {
    if (Array.isArray(results)) {
      // Already an array of objects
      formattedResults = results;
    }
    else if (typeof results === "string") {
      // Check if it's JSON stringified array
      if (results.trim().startsWith("[")) {
        formattedResults = JSON.parse(results);
      } else {
        // Split by new lines (each line = one result)
        const lines = results.split("\n").map((l) => l.trim()).filter(Boolean);

        formattedResults = lines.map((line) => {
          if (line.includes("-")) {
            const [value, label] = line.split("-").map((s) => s.trim());
            return { value, label };
          } else {
            return { value: line, label: "" };
          }
        });
      }
    } else {
      formattedResults = [];
    }
  } catch (err) {
    console.error("Error parsing results:", err);
    throw new ApiError(400, "Invalid results format");
  }



  // Create project in PostgreSQL via Prisma
  let project;

  try {
    project = await prisma.project.create({
      data: {
        client,
        industry,
        challenge,
        solution,
        images: uploadedImages,
        results: formattedResults,
        ownerId: userId || null,
      },
    });
  } catch (err) {
    console.error("Project creation failed:", err);
    throw new ApiError(500, "Database error while creating project");
  }


  // Return response
  return res
    .status(201)
    .json(new ApiResponse(200, project, "Project added successfully"));
});

/* ---------------------- Get All Projects ---------------------- */
const projectsList = AsyncHandler(async (req, res) => {
  // Fetch all projects, sorted by createdAt (latest first)
  const projects = await prisma.project.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          full_name: true,
        },
      },
    },
  });
  console.log("Projects from DB:", projects);
  return res
    .status(200)
    .json(new ApiResponse(200, projects, "Projects fetched successfully"));
});
/* ---------------------- Get Single Project ---------------------- */
// const getSingleProject = AsyncHandler(async (req, res) => {
//   const projectId = req.params.projectId;

//   const project = await Project.aggregate([
//     {
//       $match: { _id: new mongoose.Types.ObjectId(projectId) },
//     },
//     {
//       $lookup: {
//         from: "users",
//         localField: "owner",
//         foreignField: "_id",
//         as: "owner",
//       },
//     },
//     {
//       $unwind: {
//         path: "$owner",
//         preserveNullAndEmptyArrays: true,
//       },
//     },
//     {
//       $project: {
//         _id: 1,
//         title: 1,
//         description: 1,
//         category: 1,
//         technologies: 1,
//         liveUrl: 1,
//         githubUrl: 1,
//         image: 1,
//         createdAt: 1,
//         owner: {
//           fullName: 1,
//           username: 1,
//           avatar: 1,
//         },
//       },
//     },
//   ]);

//   if (!project || !project.length) {
//     return res.status(404).json(new ApiResponse(404, null, "Project not found"));
//   }

//   return res
//     .status(200)
//     .json(new ApiResponse(200, project[0], "Project fetched successfully"));
// });

/* ---------------------- Delete Project ---------------------- */
const deleteSingleProject = AsyncHandler(async (req, res) => {
  const projectId = req.params.projectId;

  // 1) Find project by ID
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new ApiError(404, "Project not found in DB");
  }

  // 2) Delete all associated images from Cloudinary
  if (project.images && Array.isArray(project.images) && project.images.length > 0) {
    try {
      await Promise.all(
        project.images.map(async (url) => {
          try {
            await deleteFromCloudinary(url);
          } catch (err) {
            console.error(" Failed to delete image:", url, err);
            throw new ApiError(500, `Failed to delete image from Cloudinary: ${url}`);
          }
        })
      );
    } catch (err) {
      throw new ApiError(500, "Error occurred while deleting project images");
    }
  }

  // 3) Delete project record from database
  await prisma.project.delete({
    where: { id: projectId },
  });

  // 4) Send response
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Project deleted successfully"));
});


/* ---------------------- Update Project ---------------------- */
const updateProjectDetails = AsyncHandler(async (req, res) => {
  const { client, industry, challenge, solution, results } = req.body;
  const projectId = req.params.projectId;

  console.log("Update krne wala data:", req.body);

  // 1) Find existing project
  const existingProject = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!existingProject) {
    throw new ApiError(404, "Project not found in DB");
  }

  const updateFields = {};

  // 2) Handle existing and new images
  const existingImages = Array.isArray(req.body.existingImages)
    ? req.body.existingImages
    : req.body.existingImages
      ? [req.body.existingImages] // if only one existing image
      : [];

  const newImageFiles = req.files?.images || [];

  console.log("Existing Images (user kept):", existingImages);
  console.log("Newly uploaded images:", newImageFiles);

  // 3) Upload new images to Cloudinary
  const newUploadedUrls =
    newImageFiles.length > 0
      ? await Promise.all(
        newImageFiles.map(async (file) => {
          try {
            const uploaded = await uploadOnCloudinary(file.path);

            if (!uploaded?.url) {
              // Agar upload result me URL missing hai
              throw new ApiError(500, "Failed to upload image to Cloudinary.");
            }

            return uploaded.url;
          } catch (err) {
            console.error("Cloudinary upload failed for:", file.path, err);
            // Yahan controlled error throw hoga
            throw new ApiError(
              500,
              "One or more images could not be uploaded to Cloudinary."
            );
          }
        })
      )
      : [];

  // 4) Find which old images were deleted by user
  const oldImages = existingProject.images || [];
  const deletedImages = oldImages.filter((url) => !existingImages.includes(url));
  console.log(" Images need to delet:", deletedImages);
  // 5) Delete only those removed images from Cloudinary
  if (deletedImages.length > 0) {
    try {
      await Promise.all(
        deletedImages.map(async (url) => {
          try {
            await deleteFromCloudinary(url);
          } catch (err) {
            console.error("Failed to delete old image:", url, err);
            // propagate to outer catch
            throw new ApiError(500, `Failed to delete image: ${url}`);
          }
        })
      );
    } catch (error) {
      console.error("Image deletion error:", error);
      throw new ApiError(500, "One or more images could not be deleted from Cloudinary.");
    }
  }


  // 6) Merge remaining existing + newly uploaded images
  const finalImages = [...existingImages, ...newUploadedUrls];
  updateFields.images = finalImages;

  // 7) Simple string fields
  if (client) updateFields.client = client;
  if (industry) updateFields.industry = industry;
  if (challenge) updateFields.challenge = challenge;
  if (solution) updateFields.solution = solution;

  // 8) Parse results field (string → array of objects)
  if (results) {
    try {
      if (Array.isArray(results)) {
        updateFields.results = results;
      } else if (typeof results === "string") {
        if (results.trim().startsWith("[")) {
          updateFields.results = JSON.parse(results);
        } else {
          const lines = results
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);

          updateFields.results = lines.map((line) => {
            if (line.includes("-")) {
              const [value, label] = line.split("-").map((s) => s.trim());
              return { value, label };
            } else {
              return { value: line, label: "" };
            }
          });
        }
      } else {
        updateFields.results = [];
      }
    } catch (err) {
      throw new ApiError(400, "Invalid results format");
    }
  }

  // 9) Update project in DB
  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: updateFields,
  });

  console.log("Updated Project:", updatedProject);

  // 10) Response
  return res
    .status(200)
    .json(new ApiResponse(200, updatedProject, "Project updated successfully"));
});

export {
  addProject,
  projectsList,
  // getSingleProject,
  deleteSingleProject,
  updateProjectDetails,
};

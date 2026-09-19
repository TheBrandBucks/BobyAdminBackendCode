import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/APIErrorStandarize.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/APIRespStandarize.js";
import { prisma } from "../config/prismaClient.js";

const AddVideo = AsyncHandler(async (req, res) => {
  const { title, description, youtubelink } = req.body;
  const userId = req.user?.id; // Prisma uses 'id' (not _id like Mongo)

  // Validation
  if ([title, description, youtubelink].some((f) => !f?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if video already exists
  const videoExist = await prisma.video.findFirst({
    where: {
      OR: [{ title }, { description }],
    },
  });

  if (videoExist) {
    throw new ApiError(409, "Video already exists");
  }

  //Check and upload thumbnail
  const ThumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
  if (!ThumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const uploadedThumbnail = await uploadOnCloudinary(ThumbnailLocalPath);
  if (!uploadedThumbnail || !uploadedThumbnail.url) {
    throw new ApiError(400, "Thumbnail upload failed");
  }

  //Save video entry in PostgreSQL
  const video = await prisma.video.create({
    data: {
      title,
      description,
      thumbnail: uploadedThumbnail.url,
      videoFile: youtubelink,
      owner: {
        connect: { id: userId },
      },
      // duration can be optional, or add it if available
    },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!video) {
    throw new ApiError(500, "Something went wrong while adding video");
  }

  // Return success response
  return res
    .status(201)
    .json(new ApiResponse(200, video, "Video added successfully"));
});

//get all videos:
const VideosList = AsyncHandler(async (req, res) => {
  try {
    //Fetch all videos, sorted by newest first
    const videos = await prisma.video.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    //If no videos found
    if (!videos || videos.length === 0) {
      throw new ApiError(404, "No videos found");
    }

    //Success response
    return res
      .status(200)
      .json(new ApiResponse(200, videos, "Videos fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to fetch videos");
  }
});

// how to get single video:---> using populate method
// const getsingleVideo = AsyncHandler(async (req, res) => {
//     const video = await Video.findById(req.params.videoId)
//         .populate("owner", "fullName username avatar") // Owner ke sirf selected fields fetch karenge
//         .select("_id videoFile thumbnail title description owner"); // Sirf required fields select ki hain

//     if (!video) {
//         return res.status(404).json(new ApiResponse(404, null, "Video not found"));
//     }

//     return res.status(200).json(new ApiResponse(200, video, "Video fetched successfully"));
// });

//  get single video:---> using aggregate method
const getsingleVideo = AsyncHandler(async (req, res) => {
  const { videoId } = req.params;
  try {
    // Fetch video by ID with owner relation
    const video = await prisma.video.findUnique({
      where: {
        id: videoId,
      },
      select: {
        id: true,
        videoFile: true,
        thumbnail: true,
        title: true,
        description: true,
        owner: {
          select: {
            id: true,
            full_name: true,
            email: true,

          },
        },
      },
    });

    // If not found
    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    //  Return success response
    return res
      .status(200)
      .json(new ApiResponse(200, video, "Video fetched successfully"));
  } catch (error) {
    console.error("Error fetching video:", error);
    throw new ApiError(500, error.message || "Failed to fetch video");
  }
});

// delete single video
const deleteSingleVideo = AsyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // Find the video
  const video = await prisma.video.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Delete thumbnail from Cloudinary
  if (video.thumbnail) {
    try {
      await deleteFromCloudinary(video.thumbnail);
    } catch (error) {
      console.error("Error deleting thumbnail from Cloudinary:", error);
    }
  }

  // Delete video from database
  await prisma.video.delete({
    where: { id: videoId },
  });

  // Respond success
  return res
    .status(200)
    .json(
      new ApiResponse(200, null, "Video and associated files deleted successfully :)")
    );
});

// update single video
const updateVideoDetails = AsyncHandler(async (req, res) => {
  const { title, description, youtubelink } = req.body;
  const { videoId } = req.params;

  // Validate at least one field
  if (!title && !description && !req.files?.thumbnail && !youtubelink) {
    throw new ApiError(
      400,
      "At least one field (title, description, thumbnail, youtubelink) is required for update"
    );
  }

  // Find existing video
  const existingVideo = await prisma.video.findUnique({
    where: { id: videoId },
  });

  if (!existingVideo) {
    throw new ApiError(404, "Video not found in database");
  }

  // Prepare fields to update
  const updateFields = {};

  // Handle thumbnail upload
  if (req.files?.thumbnail?.[0]?.path) {
    const ThumbnailLocalPath = req.files.thumbnail[0].path;

    // Upload new & delete old in parallel
    const [Thumbnail] = await Promise.all([
      uploadOnCloudinary(ThumbnailLocalPath),
      existingVideo.thumbnail
        ? deleteFromCloudinary(existingVideo.thumbnail)
        : Promise.resolve(null),
    ]);

    if (!Thumbnail || !Thumbnail.url) {
      throw new ApiError(400, "Thumbnail upload failed");
    }

    updateFields.thumbnail = Thumbnail.url;
  }

  // Handle text fields
  if (title) updateFields.title = title;
  if (description) updateFields.description = description;
  if (youtubelink) updateFields.videoFile = youtubelink;

  // Update video record in DB
  const updatedVideo = await prisma.video.update({
    where: { id: videoId },
    data: updateFields,
  });

  console.log(" Updated video from DB:", updatedVideo);

  // Send response
  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});
export {
  AddVideo,
  VideosList,
  getsingleVideo,
  deleteSingleVideo,
  updateVideoDetails
};
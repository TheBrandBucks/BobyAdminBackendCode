import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/APIErrorStandarize.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/APIRespStandarize.js";
import { prisma } from "../config/prismaClient.js";
/* ---------------------- Add Blog ---------------------- */
const addBlog = AsyncHandler(async (req, res) => {
  const { title, excerpt, content, author, category, readTime, date } = req.body;
  const userId = req.user?.id; // assuming admin user is logged in
  console.log("User id from frontend to Add blog", userId);
  if ([title, excerpt, content, category, readTime].some((field) => !field?.trim())) {
    throw new ApiError(400, "All required fields must be filled");
  }

  // check if blog already exists with same title
  // Check if blog already exists with same title
  const blogExist = await prisma.blog.findUnique({
    where: { title },
  });

  if (blogExist) {
    throw new ApiError(409, "Blog with this title already exists");
  }

  // handle image upload
  const imageLocalPath = req.files?.image?.[0]?.path;
  if (!imageLocalPath) {
    throw new ApiError(400, "Image is required");
  }

  const uploadedImage = await uploadOnCloudinary(imageLocalPath);
  if (!uploadedImage || !uploadedImage.url) {
    throw new ApiError(400, "Image upload failed");
  }

  // create blog
  const blog = await prisma.blog.create({
    data: {
      title,
      excerpt,
      content,
      author,
      date: date ? new Date(date) : new Date(),
      category,
      readTime,
      image: uploadedImage.url,
      owner: userId ? { connect: { id: userId } } : undefined, // connect to user if exists
    },
  });
  console.log("Blog Added Successfully:", blog)
  if (!blog) {
    throw new ApiError(500, "Something went wrong while adding Blog");
  }
  return res.status(201).json(new ApiResponse(200, blog, "Blog added successfully"));
});

/* ---------------------- Get All Blogs ---------------------- */
const blogsList = AsyncHandler(async (req, res) => {
  try {
    const blogs = await prisma.blog.findMany({
      orderBy: {
        createdAt: 'desc', // sort newest first
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
    console.log("Blogs from Postgree", blogs);
    return res
      .status(200)
      .json(new ApiResponse(200, blogs, "Blogs fetched successfully"));
  } catch (error) {
    console.error("Error fetching blogs:", error);
    throw new ApiError(500, "Failed to fetch blogs");
  }
});


/* ---------------------- Get Single Blog ---------------------- */
const getSingleBlog = AsyncHandler(async (req, res) => {
  const { blogId } = req.params;

  // Fetch blog with related owner
  const blog = await prisma.blog.findUnique({
    where: { id: blogId },
    include: {
      owner: {
        select: {
          id: true,
          full_name: true,
          email: true,
        },
      },
    },
  });

  if (!blog) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Blog not found"));
  }

  // Response structure 
  const formattedBlog = {
    id: blog.id,
    title: blog.title,
    excerpt: blog.excerpt,
    content: blog.content,
    author: blog.author,
    category: blog.category,
    readTime: blog.readTime,
    image: blog.image,
    createdAt: blog.createdAt,
    owner: blog.owner
      ? {
        id: blog.owner.id,
        fullName: blog.owner.full_name,
        email: blog.owner.email,
      }
      : null,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, formattedBlog, "Blog fetched successfully"));
});

/* ---------------------- Delete Blog ---------------------- */
const deleteSingleBlog = AsyncHandler(async (req, res) => {
  const { blogId } = req.params;

  // Check if the blog exists
  const blog = await prisma.blog.findUnique({
    where: { id: blogId },
  });

  if (!blog) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Blog not found"));
  }

  console.log("Blog inside DB:", blog);

  // Delete blog image from Cloudinary
  if (blog.image) {
    await deleteFromCloudinary(blog.image);
  }

  //  Delete blog from PostgreSQL
  await prisma.blog.delete({
    where: { id: blogId },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Blog deleted successfully"));
});

/* ---------------------- Update Blog ---------------------- */
const updateBlogDetails = AsyncHandler(async (req, res) => {
  const { title, excerpt, content, author, category, readTime, date } = req.body;
  const { blogId } = req.params;

  //Check if blog exists
  const existingBlog = await prisma.blog.findUnique({
    where: { id: blogId },
  });

  if (!existingBlog) {
    throw new ApiError(404, "Blog not found in database");
  }

  // Initialize update fields
  const updateFields = {};

  //Handle image upload + delete old
  if (req.files?.image?.[0]?.path) {
    const newImageLocalPath = req.files.image[0].path;

    const [newImage] = await Promise.all([
      uploadOnCloudinary(newImageLocalPath),
      existingBlog.image
        ? deleteFromCloudinary(existingBlog.image)
        : Promise.resolve(null),
    ]);

    if (!newImage || !newImage.url) {
      throw new ApiError(400, "Image upload failed");
    }

    updateFields.image = newImage.url;
  }

  // Handle text fields
  if (title) updateFields.title = title;
  if (excerpt) updateFields.excerpt = excerpt;
  if (content) updateFields.content = content;
  if (author) updateFields.author = author;
  if (category) updateFields.category = category;
  if (readTime) updateFields.readTime = readTime;
  if (date) updateFields.date = new Date(date);

  // Update the record in Prisma
  const updatedBlog = await prisma.blog.update({
    where: { id: blogId },
    data: updateFields,
  });
  console.log("Updated Blog from Db:", updatedBlog);
  //Return response
  return res
    .status(200)
    .json(new ApiResponse(200, updatedBlog, "Blog updated successfully"));
});

export {
  addBlog,
  blogsList,
  getSingleBlog,
  deleteSingleBlog,
  updateBlogDetails
};

import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/APIErrorStandarize.js";
import { ApiResponse } from "../utils/APIRespStandarize.js";
import { prisma } from "../config/prismaClient.js";

const validTypes = new Set(["blog", "faq"]);

const categoriesList = AsyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return res
    .status(200)
    .json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

const addCategory = AsyncHandler(async (req, res) => {
  const name = req.body.name?.trim();
  const type = req.body.type?.trim();

  if (!name || !validTypes.has(type)) {
    throw new ApiError(400, "Category name and a valid type are required");
  }

  const category = await prisma.category.create({
    data: { name, type },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, category, "Category added successfully"));
});

const deleteCategory = AsyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const category = await prisma.category.findUnique({ where: { id: categoryId } });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  await prisma.category.delete({ where: { id: categoryId } });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Category deleted successfully"));
});

export { categoriesList, addCategory, deleteCategory };
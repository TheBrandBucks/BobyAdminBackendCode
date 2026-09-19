import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/APIErrorStandarize.js";
import { ApiResponse } from "../utils/APIRespStandarize.js";
import { prisma } from "../config/prismaClient.js";
/* ---------------------- Add Faq ---------------------- */
const addFaq = AsyncHandler(async (req, res) => {
  const { question, answer, category } = req.body;
  const userId = req.user?.id; // assuming admin user is logged in
  console.log("Data from front end:", req.body);
  // Validate required fields
  if ([question, answer, category].some((field) => !field?.trim())) {
    throw new ApiError(400, "All required fields must be filled");
  }

  // Check if FAQ with same question already exists
  const faqExists = await prisma.faq.findUnique({
    where: { question },
  });

  if (faqExists) {
    throw new ApiError(409, "FAQ with this question already exists");
  }


  // Create FAQ record in Prisma
  const faq = await prisma.faq.create({
    data: {
      question,
      answer,
      category,
      owner: userId ? { connect: { id: userId } } : undefined,
    },
  });

  if (!faq) {
    throw new ApiError(500, "Something went wrong while adding FAQ");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, faq, "FAQ added successfully"));
});

/* ---------------------- Get All faqs ---------------------- */
const faqsList = AsyncHandler(async (req, res) => {
  try {
    const faqs = await prisma.faq.findMany({
      orderBy: {
        createdAt: "desc", // newest first
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

    console.log("FAQs from PostgreSQL:", faqs);

    return res
      .status(200)
      .json(new ApiResponse(200, faqs, "FAQs fetched successfully"));
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    throw new ApiError(500, "Failed to fetch FAQs");
  }
});


/* ---------------------- Get Single faq ---------------------- */
const getSingleFaq = AsyncHandler(async (req, res) => {
  const { faqId } = req.params;

  // Fetch faq with related owner
  const faq = await prisma.faq.findUnique({
    where: { id: faqId },
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

  if (!faq) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "FAQ not found"));
  }

  // Response structure
  const formattedFaq = {
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    createdAt: faq.createdAt,
    owner: faq.owner
      ? {
        id: faq.owner.id,
        fullName: faq.owner.full_name,
        email: faq.owner.email,
      }
      : null,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, formattedFaq, "FAQ fetched successfully"));
});


/* ---------------------- Delete faq ---------------------- */
const deleteSingleFaq = AsyncHandler(async (req, res) => {
  const { faqId } = req.params;

  // Check if the FAQ exists
  const faq = await prisma.faq.findUnique({
    where: { id: faqId },
  });

  if (!faq) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "FAQ not found"));
  }

  console.log("FAQ inside DB:", faq);



  //Delete FAQ from PostgreSQL
  await prisma.faq.delete({
    where: { id: faqId },
  });

  //Return success response
  return res
    .status(200)
    .json(new ApiResponse(200, null, "FAQ deleted successfully"));
});


/* ---------------------- Update faq ---------------------- */
const updateFaqDetails = AsyncHandler(async (req, res) => {
  const { question, answer, category } = req.body;
  const { faqId } = req.params;

  // Check if FAQ exists
  const existingFaq = await prisma.faq.findUnique({
    where: { id: faqId },
  });

  if (!existingFaq) {
    throw new ApiError(404, "FAQ not found in database");
  }

  // Prepare fields to update
  const updateFields = {};

  if (question) updateFields.question = question;
  if (answer) updateFields.answer = answer;
  if (category) updateFields.category = category;

  // Update FAQ in PostgreSQL
  const updatedFaq = await prisma.faq.update({
    where: { id: faqId },
    data: updateFields,
  });

  console.log("Updated FAQ from DB:", updatedFaq);

  //  Return success response
  return res
    .status(200)
    .json(new ApiResponse(200, updatedFaq, "FAQ updated successfully"));
});


export {
  addFaq,
  faqsList,
  getSingleFaq,
  deleteSingleFaq,
  updateFaqDetails
};

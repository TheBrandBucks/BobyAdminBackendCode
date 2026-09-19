import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/APIErrorStandarize.js"
import { ApiResponse } from "../utils/APIRespStandarize.js";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import { prisma } from "../config/prismaClient.js";
//--> Prisma Client
export const generateAccessAndRefereshTokens = async (userId) => {
  // Find user
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Create Access Token
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.full_name, // ✅ schema.prisma me field ka naam full_name hai
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );

  // Create Refresh Token
  const refresh_token = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );

  // Save refresh token in DB
  await prisma.users.update({
    where: { id: userId },
    data: { refresh_token },
  });

  return { accessToken, refresh_token };
};

// --> Prisma Client
const registerUser = AsyncHandler(async (req, res) => {
  const { fullName, email, password, role } = req.body;
console.log("Data from Frontend:", req.body);
  // Validate input
  if ([fullName, email].some((f) => !f?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if user already exists
  const existingUser = await prisma.users.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  // Hash password
  const hashedPassword = password
    ? await bcrypt.hash(password, 10)
    : "";

  // Create user
  const newUser = await prisma.users.create({
    data: {
      full_name: fullName,
      email,
      password: hashedPassword,
      role: role || "user",
    },
  });

  // Generate tokens
  const { accessToken, refresh_token } = await generateAccessAndRefereshTokens(newUser.id);

  // Don't send refresh token or password back to client
  const safeUser = {
    id: newUser.id,
    full_name: newUser.full_name,
    email: newUser.email,
    role: newUser.role,
    created_at: newUser.created_at,
    updated_at: newUser.updated_at,
  };

  return res
    .status(201)
    .json(new ApiResponse(201, { user: safeUser }, "User created successfully"));
});

//--> Prisma Client
const loginUser = AsyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // console.log("Data from Frontend:",req.body);
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  // Find user in DB
  const user = await prisma.users.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(404, "User does not exist. Please register first.");
  }

  // Compare password
  const isPasswordValid = await bcrypt.compare(password, user.password || "");
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Generate tokens (this will also update refresh_token in DB)
  const { accessToken, refresh_token } = await generateAccessAndRefereshTokens(user.id);

  // Fetch updated user without sensitive fields
  const loggedInUser = await prisma.users.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
      created_at: true,
    },
  });

  // Cookie options
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refresh_token, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken: refresh_token,
        },
        "User logged in successfully"
      )
    );
});

{/*Google Authentication for Admin*/ }
const googleAuth = async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log("Data from front end:", email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        data: null,
      });
    }

    // Find user in Supabase
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: "User does not exist, please register yourself.",
        data: null,
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } =
      await generateAccessAndRefereshTokens(user.id);

    // Fetch updated user without password & refreshToken
    const { data: loggedInUser } = await supabase
      .from("users")
      .select("id, fullName, email, role, created_at")
      .eq("id", user.id)
      .single();

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        success: true,
        message: "User logged in successfully",
        data: {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
      data: null,
    });
  }
};


{/*Google authentication for Normal user also for admin
    if useremail exist then send jwt
    else create user thriugh email then send jwt 
    */}
{/*manualy add email and role:admin of Admin in DB*/ }

const UsergoogleAuth = async (req, res, next) => {
  try {
    const { email, fullName, password, role } = req.body;
    console.log("Data from front end:", email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        data: null,
      });
    }

    // 1️⃣ Check if user exists
    let { data: user, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    // 2️⃣ If not exists → create user
    if (findError || !user) {
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            full_name: fullName || "User",
            email,
            password: password || "", // You can hash this before saving
            role: role || "user",
          },
        ])
        .select("*")
        .single();

      if (insertError) throw insertError;
      user = newUser;
    }

    // 3️⃣ Generate tokens
    const { accessToken, refreshToken } =
      await generateAccessAndRefereshTokens(user.id);

    // 4️⃣ Fetch clean user (no password / refreshToken)
    const { data: loggedInUser } = await supabase
      .from("users")
      .select("id, full_name, email, role, created_at")
      .eq("id", user.id)
      .single();

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        success: true,
        message: "User logged in successfully",
        data: {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
      data: null,
    });
  }
};





export {
  registerUser,
  loginUser,
  googleAuth,
  UsergoogleAuth,
};
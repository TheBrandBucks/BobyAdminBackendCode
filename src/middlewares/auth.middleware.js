import { ApiError } from "../utils/APIErrorStandarize.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";

import jwt from "jsonwebtoken"
// import { User } from "../models/user.model.js";
import { prisma } from "../config/prismaClient.js";
// jis user k paas jwts he woh login he
export const verifyJWT = AsyncHandler(async (req, _, next) => {
  //agr res use nhi ho rha to _ lga do
  //req me bhi hum cookie acces kr skte
  //res me hum cookie bhej skte
  try {
    //web k case me hum cookies se bhi tikens le skte // or android/webapp k case me request k header se cookies aae gi

    //in headre we pass tokens in header in this way   Authorization: Bearer <token>
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")// aksar header Authorization aata he
    console.log("Token from Frontend:", token)

    // console.log(token);
    if (!token) {
      throw new ApiError(401, "Unauthorized request")
    }
    // Verify the token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        // Special message for frontend agr Token Expire ho gya toh
        throw new ApiError(401, "Session expired. Please log in again.");
      } else {
        throw new ApiError(401, "Invalid or malformed token.");
      }
    }

    console.log("Decoded Token ID:", decodedToken.id);


    // User fetch Prisma se
    const user = await prisma.users.findUnique({
      where: { id: decodedToken.id },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
      },
    });
    // console.log("Blogs added by user:",user.blogs);
    if (!user) {
      throw new ApiError(401, "Invalid Access Token or user not found");
    }


    req.user = user;// ab hum req me user ko inject kr de ge
    next()// jese hi is middle ware ka kaam ho gy to next controller me move ho jao
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token")
  }

})
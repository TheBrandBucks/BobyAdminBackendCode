import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

//isi configuration ki waja se hi hum cloudinary ko securily use kr pa rhe he
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});



// file upload hone ka kaam time consuming he or is me error bhi aaa skta he to trycatch me likho
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null
    //upload any file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto"
    })
    // file has been uploaded successfull
    //console.log("file is uploaded on cloudinary ", response.url);

    fs.unlinkSync(localFilePath)// jese hi file upload ho jay to local sever se file  ko del kar do

    return response;// responce.url give us the URL of uploaded file on clodinary

  } catch (error) {
    console.log("Error during uploading Picture");
    fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
    return null;
  }
}


// this is  function to  delete old file from cloud
const deleteFromCloudinary = async (fileUrl) => {
  if (!fileUrl) return;

  // Extract public_id (remove domain, version, and extension)
  const publicId = fileUrl.split('/').slice(-1)[0].split('.')[0];

  // Automatically detect resource type
  const resourceType = getResourceTypeFromUrl(fileUrl);

  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log("Deleted from Cloudinary:", result);
  } catch (error) {
    console.error("Error deleting file:", error);
  }
};


// Function to detect resource type
const getResourceTypeFromUrl = (fileUrl) => {
  const ext = fileUrl.split('.').pop().toLowerCase(); // Get file extension

  if (["mp4", "avi", "mov", "mkv"].includes(ext)) {
    return "video";
  } else if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    return "image";
  } else {
    return "raw"; // For other file types
  }
};



export { uploadOnCloudinary, deleteFromCloudinary }





















//code to delete the file from clodinary
/*// Function to extract public_id from the cloudinary uploaded image URL
const extractPublicId = (cloudinaryUrl) => {
  const parts = cloudinaryUrl.split("/");
  // Remove version and file extension (e.g., /v1627657324/ and .jpg)
  const versionIndex = parts.findIndex((part) => part.startsWith("v"));
  const publicIdParts = parts.slice(versionIndex + 1).join("/").split(".");
  return publicIdParts[0];
};

// Delete old image using public_id from URL
const deleteOldImage = async (imageUrl) => {
  try {
    const publicId = extractPublicId(imageUrl);
    console.log("Extracted public_id:", publicId);

    const deleteResponse = await cloudinary.uploader.destroy(publicId);
    console.log("Delete Response:", deleteResponse);
  } catch (error) {
    console.error("Error deleting image:", error);
  }
};

// Example usage
const oldImageUrl = "https://res.cloudinary.com/demo/image/upload/v1627657324/my_folder/my_image.jpg";
deleteOldImage(oldImageUrl);

*/


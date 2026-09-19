import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp")// file ko kha save kare
  },
  filename: function (req, file, cb) {
    // file ka name orignal file wala rakhao..nhi to chatgpt se hum ye random bhi likva skte
    // lekin is ki i think need nhi hoti.. cus local se file forun del ho jati
    cb(null, file.originalname)
  }
})


// yehi uploader asal me middle ware he jo k controller or router k beech inject ho ga...
// yani request or responce k beech koi he//
export const upload = multer({
  storage, // starage will give me path of file this is stored on Local server
})
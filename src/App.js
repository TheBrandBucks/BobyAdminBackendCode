import express from 'express';
import cookieParser from 'cookie-parser';
import nodemailer from "nodemailer";
import cors from 'cors';
const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN,// some time is me hum aik array det eh jis me mibile or web k front ka URL hota he
  credentials: true
}))
app.use(express.json({ limit: "20kb" }));// alow server to accept json data
app.use(express.urlencoded({ extended: true, limit: "20kb" }))// alow server to accept updated url data
app.use(express.static("public")) // alow server to accept static files
app.use(cookieParser())// se detail from notes
//routes import
import userRouter from './routes/user.routes.js'
import orderRouter from './routes/orders.routes.js'
import blogRouter from './routes/blog.routes.js'
import videoRouter from './routes/video.routes.js'
import projectRouter from './routes/project.routes.js'
import faqRouter from './routes/faq.routes.js'
import categoryRouter from './routes/category.routes.js'
//routes declaration

app.use("/api/v1/users", userRouter)//jese hi user /api/v1/users ko visit kare ga to user router activate ho jy ga or controll is me chala jy ga
app.use("/api/v1/orders", orderRouter)
app.use("/api/v1/blogs", blogRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/projects", projectRouter)
app.use("/api/v1/faqs", faqRouter)
app.use("/api/v1/categories", categoryRouter)
// POST route to send email
app.post("/contact", async (req, res) => {
  const { name, email, message, subject } = req.body;
  console.log("data from frontend:", name, ":", email, ":", message, ":", subject)
  try {
    // Configure nodemailer transport
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for port 465, false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: process.env.TO_EMAIL,
      subject: `New Contact Form Submission: ${subject}`,
      text: `
📩 New Message Received!

🧑 Name: ${name}
📧 Email: ${email}
📘 Subject: ${subject}

📝 Message:
${message}

-----------------------------
This message was sent via your portfolio contact form.
`,
    };


    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Email send failed:", error);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});
export default app;
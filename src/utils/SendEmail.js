import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, html }) => {
  // Use your SMTP service
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or "mailgun", "sendgrid", etc.
    auth: {
      user: process.env.EMAIL_USER, // your email
      pass: process.env.EMAIL_PASS, // app-specific password
    },
  });

  const mailOptions = {
    from: `"Admin Panel" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};



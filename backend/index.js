require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Set up email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Function to generate email content using Gemini API
const generateEmailContent = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const response = await axios.post(
      endpoint,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        timeout: 10000, // 10 second timeout
      }
    );

    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response structure from Gemini API");
    }

    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error(
      "Error fetching from Gemini API:",
      error.response?.data || error.message
    );
    throw new Error(
      `Failed to generate content: ${
        error.response?.data?.error?.message || error.message
      }`
    );
  }
};

// Endpoint to send invitations
app.post("/api/generate-invitations", async (req, res) => {
  const { guests } = req.body;

  if (!guests || guests.length === 0) {
    return res.status(400).json({ message: "No guest data provided." });
  }

  try {
    const responses = [];

    for (const guest of guests) {
      if (!guest.name || !guest.email) continue;

      const prompt = `Write a formal invitation email to ${guest.name}, a ${
        guest.organization || "Organization"
      }and achievment in ${
        guest.achiement || "Achievement"
      }, inviting them to VBDA 2025. Mention the importance of their work and why their presence matters.`;

      const emailText = await generateEmailContent(prompt);
      responses.push({
        name: guest.name,
        email: guest.email,
        content: emailText,
      });
    }

    res.json({ invitations: responses });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error generating invitations." });
  }
});

app.post("/api/send-final-email", async (req, res) => {
  const { email, content } = req.body;
  if (!email || !content) {
    return res.status(400).json({ message: "Email and content are required." });
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Invitation to VBDA 2025",
      text: content,
    };

    await transporter.sendMail(mailOptions);
    return res.json({ message: `Email sent to ${email}` });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Error sending email." });
  }
});

// Start server
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});

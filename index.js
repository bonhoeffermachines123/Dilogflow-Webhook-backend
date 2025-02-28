

//backend with validation functionality:

const express = require("express");
const bodyParser = require("body-parser");
// const admin = require("firebase-admin");
const cors = require("cors");
const OpenAI = require("openai");
const axios = require("axios");
const fs = require("fs");
const pdf = require("pdf-parse");

// //experimental imports
// const stringSimilarity = require("string-similarity");

require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(cors());


const PORT = process.env.PORT || 5000;


const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

async function extractPDFText(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath); // Read the PDF as a binary buffer
    const data = await pdf(dataBuffer);         // Extract text using pdf-parse
    return data.text;                           // Return extracted text
  } catch (error) {
    console.error("❌ Error reading PDF:", error);
    return "Error extracting text from PDF.";
  }
}

var contextText = "";
var basicinfo = "";
var customers = "";
var dealers = "";

let userloggedin = false;

async function loadPDF(){
  basicinfo = await extractPDFText("./datafiles/Basicinfo.pdf");
  customers = await extractPDFText("./datafiles/Customers.pdf");
  dealers = await extractPDFText("./datafiles/Dealers.pdf");

  contextText = basicinfo;
  // console.log("contextText:",contextText);
}

loadPDF().then(()=>{
  console.log("pdf loaded successfully:");
})




const importerData = ["12345", "12346"];



async function generateAIResponse(query) {
  const prompt =  `
        You are a customer support agent for Bonhoeffer Machines. Use the document below to answer user queries. If specific information is not available, refer the user to the official website.

        ------
        DOCUMENT DATA:
        ${contextText}
        ------
        
        Special Instructions:
        - If the user asks to become an importer, respond with: "If you want to become an importer, please fill the form here: xyz.com"
        - If the user asks to become a dealer, respond with: "If you want to become a dealer, please fill the form here: xyz.com"
        - If the requested data is missing, direct the user to the official website: https://bonhoeffermachines.com/en/
        
        User Query: "${query}"
        Answer:
        `;


  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("GPT API Error:", error);
    return "I'm sorry, but I couldn't process your request.";
  }
}


app.post("/webhook", async (req, res) => {
  const userQuery = req.body.queryResult.queryText;
  const parameters = req.body.queryResult.parameters;


  // Step 2: Handle User Role
  if (!userloggedin && parameters.user_role) {
    const userRole = parameters.user_role.toLowerCase();

    if (userRole === "importer") {
      return res.json({ fulfillmentText: "Please provide your Importer ID for verification.like(My Importer id is -----)" });
    }
    else if(userRole === "customer"){
      contextText = customers + "\n" + basicinfo; // Append Dealer & Customer data
      userloggedin = true;
    }
    else if(userRole === "dealer"){
      
      contextText =  dealers + "\n" + basicinfo; // Append Dealer & Customer data
      userloggedin = true;
    }
    return res.json({ fulfillmentText: `You are a ${userRole}. How can I assist you?` });
      
      
    
  }

  // Step 3: Validate Importer ID
  if (!userloggedin && parameters.importer_id) {
    const importerID = String(parameters.importer_id).trim();

    if (importerData.includes(importerID)) {
      const filePath = `./datafiles/${importerID}.pdf`;
      const importerDetails = await extractPDFText(filePath); // Read the corresponding PDF file
      contextText =  importerDetails + "\n\n" + basicinfo; // Append Importer details
      userloggedin = true;
      return res.json({ fulfillmentText: `
          ✅ Verified Importer! What would you like to know?
          1.   🔑Want to login in CRM
          2.   📦 Product Catalog & Pricing
          3.   📋 Order Status & Tracking
          4.   📜 Compliance & Documentation
          5.   🛠️ After-Sales Support
          6.   📞 Speak to a Sales Representative

        ` });
    } else {
      return res.json({ fulfillmentText: "❌ Invalid Importer ID. You can only ask general questions." });
    }
  }

  // Step 4: Generate AI Response using updated context
  const aiResponse = await generateAIResponse(userQuery);

  return res.json({ fulfillmentText: aiResponse });
});




app.listen(PORT, () => {
  console.log(`🚀 Webhook running on port ${PORT}`);
});


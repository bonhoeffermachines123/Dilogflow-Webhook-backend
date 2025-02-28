// const express = require("express");
// const bodyParser = require("body-parser");
// const admin = require("firebase-admin");
// const cors = require("cors");
// const OpenAI = require("openai");
// const axios = require("axios");

// // //experimental imports
// // const stringSimilarity = require("string-similarity");

// require("dotenv").config();

// const PORT = process.env.PORT || 5000;

// // Initialize Firebase
// const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
// serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// const db = admin.firestore();

// // OpenAI API Key (GPT-4)
// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_KEY,
//   });
  


// const app = express();
// app.use(bodyParser.json());
// app.use(cors());


// async function generateAIResponse(query, contextText) {
//   const prompt = `
//         You are a customer support agent for Bonhoeffer Machines. Use the document below to answer user queries. If specific information is not available, refer the user to the official website.

//         ------
//         DOCUMENT DATA:
//         ${contextText}
//         ------
        
//         Special Instructions:
//         - If the user asks to become an importer, respond with: "If you want to become an importer, please fill the form here: xyz.com"
//         - If the user asks to become a dealer, respond with: "If you want to become a dealer, please fill the form here: xyz.com"
//         - If the requested data is missing, direct the user to the official website: https://bonhoeffermachines.com/en/
        
//         User Query: "${query}"
//         Answer:
//         `;


//   try {
//       const response = await openai.chat.completions.create({
//         // model: "gpt-3.5-turbo",
//         model: "gpt-4o",
//         messages: [{ role: "user", content: prompt }],
//         max_tokens: 200 //set the response limit
//       });

//       // ✅ Check if response is valid before accessing it
//       if (response.choices && response.choices.length > 0) {
//         return response.choices[0].message.content.trim();
//       } else {
//         return {success:false, message:"Sorry, no response generated"};
//       }
//   } catch (error) {
//       return {success:false, message:`❌ OpenAI API Error: ${error}`};
//   }

// }


// // app.post("/getdoc", async(req, res)=>{
// //   try {
// //     const {query} = req.body;
// //     console.log("Query",query);
// //     const doc = await searchFirebase(query);

// //     res.status(200).json({message:"success", doc});
// //   } catch (error) {
// //     res.json({error});
// //   }
    
// // })



// app.post("/webhook", async (req, res) => {
//   const userQuery = req.body.queryResult.queryText;

//   // console.log(req.body.queryResult);
  
//   // 1️⃣ Search Firebase for document text
//   const snapshot = await db.collection("documents").get();
//   const contextText = snapshot.docs[0].data().text;
// //   const contextText = await searchFirebase(userQuery);
  

//   let aiResponse;
//   if (contextText) {
//     // 2️⃣ Generate AI response
//     aiResponse = await generateAIResponse(userQuery, contextText);
//   } else {
//     aiResponse = "I'm sorry, but I couldn't find relevant information.";
//   }

//   res.json({
//     fulfillmentText: aiResponse, // 🔹 This ensures Dialogflow displays the response
//   });
  
// //   res.json({ fulfillmentText: aiResponse, contextText , message: "trying well" });
// });

// // Start local server

// app.listen(PORT, () => {
//   console.log(`🚀 Webhook running on port ${PORT}`);
// });







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



async function generateAIResponse(query, context) {
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

  // console.log("User Query:", userQuery);

  // Step 1: Detect confidential queries
  // const confidentialKeywords = ["price", "discount", "cost"];
  // const isConfidential = confidentialKeywords.some(word => userQuery.toLowerCase().includes(word));

  // if (!userloggedin && isConfidential) {
  //   return res.json({ fulfillmentText: "This information is confidential. Are you an Importer, Dealer, or Customer?" });
  // }

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
    const importerID = parameters.importer_id;

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
  const aiResponse = await generateAIResponse(userQuery, contextText);

  return res.json({ fulfillmentText: aiResponse });
});




app.listen(PORT, () => {
  console.log(`🚀 Webhook running on port ${PORT}`);
});


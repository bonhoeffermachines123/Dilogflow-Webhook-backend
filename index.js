const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const cors = require("cors");
const OpenAI = require("openai");
const axios = require("axios");

// //experimental imports
// const stringSimilarity = require("string-similarity");

require("dotenv").config();

const PORT = process.env.PORT || 5000;

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// OpenAI API Key (GPT-4)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
  });
  


const app = express();
app.use(bodyParser.json());
app.use(cors());

// async function searchFirebase(query) {
//   const snapshot = await db.collection("documents").get();
//   const documents = [];

//   // 🔹 Collect all document texts from Firebase
//   snapshot.forEach((doc) => {
//     documents.push({ id: doc.id, text: doc.data().text });
//   });

//   if (documents.length === 0) {
//     return "No relevant document found.";
//   }

//   // 🔹 Extract all texts into an array
//   const allTexts = documents.map(doc => doc.text);
//   console.log("all texts", allTexts);

//   // 🔹 Find the best matching document using cosine similarity
//   const matches = stringSimilarity.findBestMatch(query, allTexts);
//   console.log("matches", matches);
//   const bestMatch = matches.bestMatch.target;

//   return bestMatch ? bestMatch : "No relevant document found.";
// }







async function generateAIResponse(query, contextText) {
  const prompt = `You are the representtive of our company. Now, Answer the question based on the document text:\n\n${contextText}\n\nQuestion: ${query}\nAnswer:`;
  
  try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        // model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200 //set the response limit
      });

      // ✅ Check if response is valid before accessing it
      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message.content.trim();
      } else {
        return {success:false, message:"Sorry, no response generated"};
      }
  } catch (error) {
      return {success:false, message:`❌ OpenAI API Error: ${error}`};
  }

}


// app.post("/getdoc", async(req, res)=>{
//   try {
//     const {query} = req.body;
//     console.log("Query",query);
//     const doc = await searchFirebase(query);

//     res.status(200).json({message:"success", doc});
//   } catch (error) {
//     res.json({error});
//   }
    
// })



app.post("/webhook", async (req, res) => {
  const userQuery = req.body.queryResult.queryText;
  
  // 1️⃣ Search Firebase for document text
  const snapshot = await db.collection("documents").get();
  const contextText = snapshot.docs[0].data().text;
//   const contextText = await searchFirebase(userQuery);
  

  let aiResponse;
  if (contextText) {
    // 2️⃣ Generate AI response
    aiResponse = await generateAIResponse(userQuery, contextText);
  } else {
    aiResponse = "I'm sorry, but I couldn't find relevant information.";
  }

  res.json({
    fulfillmentText: aiResponse, // 🔹 This ensures Dialogflow displays the response
  });
  
//   res.json({ fulfillmentText: aiResponse, contextText , message: "trying well" });
});

// Start local server

app.listen(PORT, () => {
  console.log(`🚀 Webhook running on port ${PORT}`);
});

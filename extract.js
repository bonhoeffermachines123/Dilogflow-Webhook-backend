const admin = require("firebase-admin");
const fs = require("fs");
const pdf = require("pdf-parse");
const path = require("path");

// Initialize Firebase
const serviceAccount = require("./firebaseadminsdk.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const folderPath = "./datafiles"; // Change this to your folder name

async function extractTextFromPDF(pdfPath, docName) {
  try {
    let docRef = db.collection("documents").doc(docName);
    let docSnapshot = await docRef.get();

    if (docSnapshot.exists) {
      console.log(`⚠️ Skipping: "${docName}" already exists in Firestore.`);
      return;
    }

    let dataBuffer = fs.readFileSync(pdfPath);
    let pdfData = await pdf(dataBuffer);
    
    // Store extracted text in Firestore
    await docRef.set({ text: pdfData.text });

    console.log(`✅ PDF uploaded: ${docName}`);
  } catch (error) {
    console.error(`❌ Error processing ${docName}:`, error);
  }
}

// Read all PDF files in the folder and process them
fs.readdir(folderPath, (err, files) => {
  if (err) {
    console.error("❌ Error reading folders in loop:", err);
    return;
  }

  
  files.forEach(file => {
    let filePath = path.join(folderPath, file);
    let docName = path.basename(file, ".pdf"); // Remove .pdf extension

    extractTextFromPDF(filePath, docName);
  });
});

console.log("Hello i am in extract file:");
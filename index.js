
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

var basicinfo = "";
var customers = "";
var dealers = "";
var productdetails = "";


async function loadPDF(){
  basicinfo = await extractPDFText("./datafiles/Basicinfo.pdf");
  customers = await extractPDFText("./datafiles/Customers.pdf");
  dealers = await extractPDFText("./datafiles/Dealers.pdf");
  productdetails = await extractPDFText("./datafiles/product-details.pdf");
  // console.log("contextText:",contextText);
}

loadPDF().then(()=>{
  console.log("pdf loaded successfully:");
})




const importerData = ["12345", "12346"];



async function generateAIResponse(query, contextdoc) {
  const prompt =  `
        You are a customer support agent for Bonhoeffer Machines. Use the document below to answer user queries. If specific information is not available, refer the user to the official website.

        ------
        DOCUMENT DATA:
        ${contextdoc}
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
      temperature: 0.7,
      max_tokens: 200
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("GPT API Error:", error);
    return "I'm sorry, but I couldn't process your request.";
  }
}



// modifies webhook api
app.post("/webhook", async (req, res) => {
    
  const userQuery = req.body.queryResult.queryText;
  const parameters = req.body.queryResult.parameters;
  let contextText = basicinfo;
  console.log("req.body :  ", req.body);
  
  const sessionId = req.body.session; // ✅ Extract session ID correctly
  // console.log("Req.body is:", req.body);

// Woeking on context based info
  // Retrieve active contexts from Dialogflow request
  const contexts = req.body.queryResult.outputContexts || [];
  const userRoleContext = contexts.find(ctx => ctx.name.includes("user_role_context"));

  // Extract existing user role from context (if any)
  let userRole = userRoleContext?.parameters?.user_role || null;
  let importerID = userRoleContext?.parameters?.importer_id || null;


  //For Product segment normally:
//   console.log("user role:",parameters?.user_role, " and in lowercase:", parameters?.user_role?.toLowerCase());
  if(userRole?.toLowerCase() == "product segments" || parameters?.user_role?.toLowerCase() == "product segments" ){
    console.log("Present in Explore segment section:");

        if(parameters.user_role){
            return res.json({
                fulfillmentMessages: [
                    {
                        "payload": {
                            "richContent": [
                                [
                                    {
                                      
                                        "type": "description",
                                        "text": [
                                            "Now, please select a product category:"
                                        ]
                                    },
                                    {
                                        "type": "chips",
                                        "options": [
                                            { "text": "Agro Industrial" },
                                            { "text": "Bonhoeffer Industrial" },
                                            { "text": "Construction" },
                                            { "text": "Diesel Machines" },
                                            { "text": "Domestic and Commercial Products" },
                                            { "text": "Electric Machines" },
                                            { "text": "Garden and Forestry" },
                                            { "text": "Wood Chiper and Chaff cutter" },
                                            { "text": "Solar" },
                                            { "text": "Special Segment" },
                                            { "text": "Sprayers and Fumigation" },
                                        ]
                                    }
                                ]
                            ]                           
                        }
                    }
                ],
                outputContexts: [
                    {
                        name: `${sessionId}/contexts/user_role_context`, // ✅ Use sessionId as is
                        lifespanCount: 50,  // Stores for 50 interactions
                        parameters: { 
                            user_role: "product segments"
                        }
                    }
                ]
            });
        }


        if(parameters.product_category){
          const selectedCategory = parameters.product_category.toLowerCase();
          // console.log("User selected category:", selectedCategory);
        
          let productOptions = [];

            if (selectedCategory === "agro") {
                productOptions = [
                    { "text": "gasoline generators" },
                    { "text": "gasoline inverter generators" },
                    { "text": "gasoline tillers" },
                    { "text": "gasoline water pumps" },
                    { "text": "gasoline engines" }
                ];
            } else if (selectedCategory === "industrial") {
                productOptions = [
                    { "text": "welding machines" },
                    { "text": "centrifugal pumps" },
                    { "text": "submersible pumps" }
                ];
            } else if (selectedCategory === "construction") {
                productOptions = [
                    { "text": "tamping rammers" },
                    { "text": "plate compactors" },
                    { "text": "concrete cutters" },
                    { "text": "concrete vibrators" },
                    { "text": "concrete power trowels" }
                ];
            } else if (selectedCategory === "diesel") {
                productOptions = [
                    { "text": "diesel water pumps" },
                    { "text": "diesel generators" },
                    { "text": "diesel engines" }
                ];
            } else if (selectedCategory === "domestic") {
                productOptions = [
                    { "text": "gasoline pressure washers" },
                    { "text": "pressure washers" },
                    { "text": "direct driven air compressors" },
                    { "text": "vacuum cleaners" } // Fixed typo "Vacuum Ceaners" to "vacuum cleaners"
                ];
            } else if (selectedCategory === "electric") {
                productOptions = [
                    { "text": "electric lawn mowers" },
                    { "text": "electric pressure washers" }
                ];
            } else if (selectedCategory === "garden") {
                productOptions = [
                    { "text": "brush cutters" },
                    { "text": "backpack brush cutters" },
                    { "text": "multi-tool equipment" },
                    { "text": "chainsaws" },
                    { "text": "hedge trimmers" },
                    { "text": "blowers" },
                    { "text": "earth augers" },
                    { "text": "water pump 2-stroke" },
                    { "text": "lawn mowers" }
                ];
            } else if (selectedCategory === "solar") {
                productOptions = [
                    { "text": "solar panels" },
                    { "text": "submersible pumps" }
                ];
            } else if (selectedCategory === "special") {
                productOptions = [
                    { "text": "trenchers" },
                    { "text": "leaf blowers" },
                    { "text": "mini dumpers" },
                    { "text": "log splitters" }
                ];
            } else if (selectedCategory === "sprayers") {
                productOptions = [
                    { "text": "knapsack sprayers" },
                    { "text": "manual sprayers" },
                    { "text": "mist dusters" },
                    { "text": "thermal foggers" }
                ];
            } else if (selectedCategory === "chiper") {
                productOptions = [
                    { "text": "wood chippers" },
                    { "text": "corn peelers and threshers" },
                    { "text": "straw cutters" }
                ];
            }
        
          return res.json({
            fulfillmentMessages: [
                    {
                        "payload": {
                            "richContent": [
                                [
                                    {
                                        "type": "description",
                                        "text": [
                                            "Now, please select a product:"
                                        ]
                                    },
                                    {
                                        "type": "chips",
                                        "options": productOptions
                                    }
                                ]
                            ]
                        }
                    }
                ]
            });
        }



        if (parameters.product) {
          const selectedProduct = parameters.product.toLowerCase();
          // console.log("User selected product:", selectedProduct);
        
          let modelOptions = [];

            if (selectedProduct === "gasoline generators") {
                modelOptions = [
                    { "text": "BON-P-GG-2.8KW" },
                    { "text": "BON-P-GG-3.7KW" },
                    { "text": "BON-P-GG-5.0KW" },
                    { "text": "BON-P-GG-7.5KW" },
                    { "text": "BON-P-GG-9.0KW" },
                    { "text": "BON-P-GG-9.5KW" },
                    { "text": "BON-P-GG-12.0KW" },
                    { "text": "BON-P-GG-13.5KW" },
                    { "text": "BON-P-GG-16.0KW" },
                    { "text": "BON-P-GG-18.5KW" }
                ];
            } else if (selectedProduct === "gasoline inverter generators") {
                modelOptions = [
                    { "text": "BON-P-GI-1.8KW" },
                    { "text": "BON-P-GI-2.1KW" },
                    { "text": "BON-P-GI-2.5KW" },
                    { "text": "BON-P-GI-2.9KW" },
                    { "text": "BON-P-GI-3.5KW" },
                    { "text": "BON-P-GI-3.8KW" },
                    { "text": "BON-P-GI-5.5KW" },
                    { "text": "BON-P-GI-7.5KW" }
                ];
            } else if (selectedProduct === "gasoline tillers") {
                modelOptions = [
                    { "text": "BON-DI-950" },
                    { "text": "BON-GT-500B" },
                    { "text": "BON-GT-500S" },
                    { "text": "BON-GT-900" },
                    { "text": "BON-GT-950T" },
                    { "text": "BON-GT-950C" }
                ];
            } else if (selectedProduct === "gasoline water pumps") {
                modelOptions = [
                    { "text": "BON-P-WP1.0-31" },
                    { "text": "BON-P-WP1.5-79" },
                    { "text": "BON-P-WP2.0-149" },
                    { "text": "BON-P-WP2.0-196" },
                    { "text": "BON-P-WP3.0-196" },
                    { "text": "BON-P-WP4.0-272" },
                    { "text": "BON-P-WP1.5-224HL" },
                    { "text": "BON-P-WP6.0-420" },
                    { "text": "BON-P-WP2.0-224HL" },
                    { "text": "BON-P-WP2.0-420HL" },
                    { "text": "BON-P-WP3.0-420HL" },
                    { "text": "BON-P-WP2.0-196CH" },
                    { "text": "BON-P-WP2.0-196TR" },
                    { "text": "BON-P-WP3.0-196TR" }
                ];
            } else if (selectedProduct === "gasoline engines") {
                modelOptions = [
                    { "text": "BON-P-GE-3.0HP" },
                    { "text": "BON-P-GE-3.5HP" },
                    { "text": "BON-P-GE-5.0HP" },
                    { "text": "BON-P-GE-4.0HP" },
                    { "text": "BON-P-GE-7.0HP" },
                    { "text": "BON-P-GE-9.0HP" },
                    { "text": "BON-P-GE-13.0HP" },
                    { "text": "BON-P-GE-14.0HP" },
                    { "text": "BON-P-GE-16.0HP" },
                    { "text": "BON-P-GE-24.0HP" },
                    { "text": "BON-P-GE-34.0HP" }
                ];
            } else if (selectedProduct === "welding machines") {
                modelOptions = [
                    { "text": "BON-WM-DUAL-200A" },
                    { "text": "BON-WM-DUAL-130A" },
                    { "text": "BON-WM-DUAL-160A" }
                ];
            } else if (selectedProduct === "centrifugal pumps") {
                modelOptions = [
                    { "text": "BON-P-CP-0.5HP" },
                    { "text": "BON-P-CP-1.0HP" },
                    { "text": "BON-P-CP-2.0HP" }
                ];
            } else if (selectedProduct === "submersible pumps") {
                modelOptions = [
                    { "text": "BON-P-SP-0.5HP" },
                    { "text": "BON-P-SP-1.0HP" },
                    { "text": "BON-P-SP-1.5HP" },
                    { "text": "BON-P-SP-2.0HP" },
                    { "text": "BON-P-SP-3.0HP" }
                ];
            } else if (selectedProduct === "tamping rammers") {
                modelOptions = [
                    { "text": "BON-P-TR-13.7KN-4.0HP" },
                    { "text": "BON-P-TR-10KN-4.0HP" }
                ];
            } else if (selectedProduct === "plate compactors") {
                modelOptions = [
                    { "text": "BON-P-PC-10.5KN-6.5HP" },
                    { "text": "BON-P-PC-15KN-6.5HP" },
                    { "text": "BON-P-PC-11KN-6.5HP" }
                ];
            } else if (selectedProduct === "concrete cutters") {
                modelOptions = [
                    { "text": "BON-P-CC-14CM-13HP" },
                    { "text": "BON-P-CC-15CM-13HP" }
                ];
            } else if (selectedProduct === "concrete vibrators") {
                modelOptions = [
                    { "text": "BON-P-CV-6M-6.5HP" }
                ];
            } else if (selectedProduct === "concrete power trowels") {
                modelOptions = [
                    { "text": "BON-PT-6.5HP" },
                    { "text": "BON-SFS-38CC" }
                ];
            } else if (selectedProduct === "diesel water pumps") {
                modelOptions = [
                    { "text": "BON-P-DWP2.0-5.0HP" },
                    { "text": "BON-P-DWP3.0-5.5HP" },
                    { "text": "BON-P-DWP4.0-10.0HP" },
                    { "text": "BON-P-DWP2.0-10.0HP" },
                    { "text": "BON-P-DWP3.0-10.5HP" }
                ];
            } else if (selectedProduct === "diesel generators") {
                modelOptions = [
                    { "text": "BON-P-DG-3.0KW" },
                    { "text": "BON-P-DG-3.5KW" },
                    { "text": "BON-P-DG-6.0KW" },
                    { "text": "BON-P-DG-6.5KW" },
                    { "text": "BON-P-DG-9.0KW" },
                    { "text": "BON-P-DG-10.0KW" }
                ];
            } else if (selectedProduct === "diesel engines") {
                modelOptions = [
                    { "text": "BON-P-DE-5.0HP" },
                    { "text": "BON-P-DE-5.5HP" },
                    { "text": "BON-P-DE-6.0HP" },
                    { "text": "BON-P-DE-9.0HP" },
                    { "text": "BON-P-DE-10.2HP" },
                    { "text": "BON-P-DE-11.0HP" },
                    { "text": "BON-P-DE-18.3HP" }
                ];
            } else if (selectedProduct === "gasoline pressure washers") {
                modelOptions = [
                    { "text": "BON-P-PW-G6.5HP-AP" },
                    { "text": "BON-P-PW-G5HP-TP" },
                    { "text": "BON-P-PW-G6.5HP-TP" },
                    { "text": "BON-P-PW-G9.0HP-TP" },
                    { "text": "BON-P-PW-G13.0HP-TP" }
                ];
            } else if (selectedProduct === "pressure washers for home use") {
                modelOptions = [
                    { "text": "BON-E-PW-1400W" },
                    { "text": "BON-E-PW-1600W" },
                    { "text": "BON-E-PW-2000W" }
                ];
            } else if (selectedProduct === "direct driven air compressors") {
                modelOptions = [
                    { "text": "BON-P-DDAC-25L" },
                    { "text": "BON-P-DDAC-50L" }
                ];
            } else if (selectedProduct === "vacuum cleaners") {
                modelOptions = [
                    { "text": "BON-VC-1400W-30L" },
                    { "text": "BON-VC-1400W-50L" }
                ];
            } else if (selectedProduct === "electric lawn mowers") {
                modelOptions = [
                    { "text": "BON-E-LM-1600W" },
                    { "text": "BON-E-LM-1800W" }
                ];
            } else if (selectedProduct === "electric pressure washers") {
                modelOptions = [
                    { "text": "BON-P-PW-E2.2KW" },
                    { "text": "BON-P-PW-E3.0KW" },
                    { "text": "BON-P-PW-E5.5KW" },
                    { "text": "BON-P-PW-E7.5KW" }
                ];
            } else if (selectedProduct === "brush cutters") {
                modelOptions = [
                    { "text": "BON-P-BC36" },
                    { "text": "BON-ET-BC53" },
                    { "text": "BON-P-BC45" }
                ];
            } else if (selectedProduct === "backpack brush cutters") {
                modelOptions = [
                    { "text": "BON-P-BP-BC45" }
                ];
            } else if (selectedProduct === "multi-tool equipment") {
                modelOptions = [
                    { "text": "BON-P-MT45" }
                ];
            } else if (selectedProduct === "chainsaws") {
                modelOptions = [
                    { "text": "BON-P-CS40" },
                    { "text": "BON-P-CS55" },
                    { "text": "BON-P-CS65" },
                    { "text": "BON-P-CS92" }
                ];
            } else if (selectedProduct === "hedge trimmers") {
                modelOptions = [
                    { "text": "BON-P-HT23" }
                ];
            } else if (selectedProduct === "blowers") {
                modelOptions = [
                    { "text": "BON-P-BBL53" },
                    { "text": "BON-P-BL26" },
                    { "text": "BON-P-BLV26" }
                ];
            } else if (selectedProduct === "earth augers") {
                modelOptions = [
                    { "text": "BON-P-EA63" },
                    { "text": "BON-P-EA52" },
                    { "text": "BON-P-EA159-4S" }
                ];
            } else if (selectedProduct === "water pump 2-stroke") {
                modelOptions = [
                    { "text": "BON-WP1.0-52-2S" }
                ];
            } else if (selectedProduct === "lawn mowers") {
                modelOptions = [
                    { "text": "BON-P-LM22" }
                ];
            } else if (selectedProduct === "solar panels") {
                modelOptions = [
                    { "text": "BON-MC-SP-430W" }
                ];
            } else if (selectedProduct === "submersible pumps") { // Note: Also appears in Category 2.3, assuming same models here
                modelOptions = [
                    { "text": "BON-P-SP-0.5HP" },
                    { "text": "BON-P-SP-1.0HP" },
                    { "text": "BON-P-SP-1.5HP" },
                    { "text": "BON-P-SP-2.0HP" },
                    { "text": "BON-P-SP-3.0HP" }
                ];
            } else if (selectedProduct === "trenchers") {
                modelOptions = [
                    { "text": "" } // No specific models provided in PDF
                ];
            } else if (selectedProduct === "leaf blowers") { // Note: Also appears in Category 7.6, assuming distinct here
                modelOptions = [
                    { "text": "No specific model is here" } // No specific models provided in PDF
                ];
            } else if (selectedProduct === "mini dumpers") {
                modelOptions = [
                    { "text": "BON-P-EMD-1100W" },
                    { "text": "MINI VOLQUETE (Snow Blade)" },
                    { "text": "MINI VOLQUETE (Hydraulic)" }
                ];
            } else if (selectedProduct === "log splitters") {
                modelOptions = [
                    { "text": "BON-P-GLS-6575" },
                    { "text": "BON-P-GLS-6561" }
                ];
            } else if (selectedProduct === "knapsack sprayers") {
                modelOptions = [
                    { "text": "BON-P-KS26" },
                    { "text": "BON-P-KS37" }
                ];
            } else if (selectedProduct === "manual sprayers") {
                modelOptions = [
                    { "text": "BON-P-MS20L-JB" },
                    { "text": "BON-P-MS5L" },
                    { "text": "BON-P-MS20L-JP" },
                    { "text": "BON-P-EMS-20" },
                    { "text": "BON-P-MS2L" }
                ];
            } else if (selectedProduct === "mist dusters") {
                modelOptions = [
                    { "text": "BON-P-MD42" },
                    { "text": "BON-P-MD52" },
                    { "text": "BON-P-MD82" }
                ];
            } else if (selectedProduct === "thermal foggers") {
                modelOptions = [
                    { "text": "BON-P-TF6L" },
                    { "text": "BON-P-TF2L" }
                ];
            } else if (selectedProduct === "wood chippers") {
                modelOptions = [
                    { "text": "High-Power Electric" },
                    { "text": "BON-P-EWC-2.2KW" },
                    { "text": "BON-P-EWC-1.5KW" },
                    { "text": "BON-P-DWC-1015" },
                    { "text": "ON-P-DWC-1012" },
                    { "text": "BON-P-DWC-710" },
                    { "text": "BON-P-GWC-2312" },
                    { "text": "BON-P-GWC-15SH" },
                    { "text": "BON-P-GWC-15SP" },
                    { "text": "BON-P-GWC-1512H" },
                    { "text": "BON-P-GWC-1515" },
                    { "text": "BON-P-GWC-1512" },
                    { "text": "BON-P-GWC-705" },
                    { "text": "BON-P-GWC-708" },
                    { "text": "BON-P-GWC-712" },
                    { "text": "BON-P-GWC-710" }
                ];
            } else if (selectedProduct === "corn peelers and threshers") {
                modelOptions = [
                    { "text": "BON-GCT-1T" },
                    { "text": "BON-ECT-1T" },
                    { "text": "BON-GCT-2T" },
                    { "text": "BON-ECT-2T" }
                ];
            } else if (selectedProduct === "straw cutters") {
                modelOptions = [
                    { "text": "BON-GCC-3T" },
                    { "text": "BON-GCC-1T" },
                    { "text": "BON-ECC-1T" }
                ];
            }
        
          return res.json({
              fulfillmentMessages: [
                  {
                      "payload": {
                          "richContent": [
                              [
                                  {
                                      "title": `Selected Product: ${selectedProduct}`,
                                      "type": "description",
                                      "text": [
                                          "Now, please select a model:"
                                      ]
                                  },
                                  {
                                      "type": "chips",
                                      "options": modelOptions
                                  }
                              ]
                          ]
                      }
                  }
              ]
          });
        }


      if (parameters.product_model) {
       
        contextText = productdetails + basicinfo;
        console.log("Our context : ",contextText);

        const query = `Provide details for model ${parameters.product_model} in a paragraph or a user friendly way, if it is present in the document. otherwise responde 'Sorry, this product is not present in our data'`;
        const aiResponse = await generateAIResponse(query, contextText);
        return res.json({ fulfillmentText: aiResponse });
    
      }


        contextText = productdetails + basicinfo;
        const query = `Answer the query: "${userQuery}" in para or pointer which will be user friendly, if present in our context.`;
        const aiResponse = await generateAIResponse(query, contextText);
        return res.json({ fulfillmentText: aiResponse });
  
  
  }



  //Now for importer:
  else if(userRole?.toLowerCase() == "importer" || parameters?.user_role?.toLowerCase() == "importer" || parameters?.importer_id){
        console.log("I am in importer role section:");

        if(parameters?.user_role?.toLowerCase() == "importer" && !importerID){
            return res.json({ fulfillmentText: "Please provide your Importer ID for verification:" });
        }
        else if(parameters?.user_role?.toLowerCase() == "importer" && importerID){
            return res.json({ fulfillmentText: "Already validated, You can ask questions:" });
        }


        if (parameters?.importer_id) {
            const importerID = String(parameters.importer_id).trim();
            console.log("I am in Parameter.importerid in importer role, Your importer ID:", importerID);
        
        
            if (importerData.includes(importerID)) {
                console.log('I am in valid importer with session ID:', sessionId);
                
                return res.json({
                    fulfillmentMessages: [  // ✅ Use fulfillmentMessages, not fulfillmentText
                        {
                            "payload": {
                                "richContent": [
                                    [
                                        {
                                            "title": "✅ Verified Importer!",
                                            "type": "description",
                                            "text": [
                                                "What would you like to know?"
                                            ]
                                        },
                                        {
                                            "type": "chips", // ✅ Correct rich content structure
                                            "options": [
                                              {
                                                    "text": "Invoice"
                                            
                                              },
                                              {
                                                  "text": "Packing List"
                                          
                                              },  
                                              {
                                                    "text": "Shipment Date"
                                            
                                                },
                                              {
                                                    "text": "Tentative Production Time"
                                            
                                                },
                                              {
                                                    "text": "Product Price List"
                                            
                                                },
                                              {
                                                    "text": "MOQ(Minimum Order Quantity)"
                                            
                                                },
                                              {
                                                    "text": "Flyers"
                                            
                                                },
                                              {
                                                    "text": "User Manuals"
                                            
                                                },
                                              {
                                                    "text": "Product Technical Details"
                                            
                                                },
                                              {
                                                    "text": "CRM Login"
                                            
                                                },
                                            ]
                                        }
                                    ]
                                ]
                            }
                        }
                    ],
                    outputContexts: [
                        {
                            name: `${sessionId}/contexts/user_role_context`, // ✅ Use sessionId as is
                            lifespanCount: 50,  // Stores for 50 interactions
                            parameters: { 
                                user_role: "importer",
                                importer_id: importerID
                            }
                        }
                    ]
                });
        
            } else {
                return res.json({ fulfillmentText: "❌ Invalid Importer ID. You can only ask general questions." });
            }
        }


        if(userRole){
            const ur = userRole.toLowerCase();
            
            if(importerID){
            let importerid = String(importerID).trim();
            const filePath = `./datafiles/${importerid}.pdf`;
            const importerDetails = await extractPDFText(filePath); // Read the corresponding PDF file
            contextText = importerDetails + "\n\n" + basicinfo; // Append Importer details
            // console.log("Contexttext is :\n",contextText);
            }else{
            return res.json({ fulfillmentText: 'Importer id is not provided or invalid:' });
            }
        }
        
            
            
        console.log("ContextTExt: ", contextText);
        const aiResponse = await generateAIResponse(userQuery, contextText);
        return res.json({ fulfillmentText: aiResponse });


  }




  if (!parameters.product_model && parameters.importer_option) {
    const selectedOption = parameters.importer_option.toLowerCase();
    console.log("User selected importer option:", selectedOption);

    // Skip category selection if CRM Login is selected
    if (selectedOption === "crm login") {
        return res.json({ fulfillmentText: "🔑 You can access CRM here: [CRM Login Link](https://crm.bonhoeffermachines.com)" });
    }

    // Ask user to select a category first
    return res.json({
        fulfillmentMessages: [
            {
                "payload": {
                    "richContent": [
                        [
                            {
                                "title": `Selected Option: ${selectedOption}`,
                                "type": "description",
                                "text": [
                                    "Now, please select a product category:"
                                ]
                            },
                            {
                                "type": "chips",
                                "options": [
                                    { "text": "Agro Industrial" },
                                    { "text": "Bonhoeffer Industrial" },
                                    { "text": "Construction" },

                                ]
                            }
                        ]
                    ]
                }
            }
        ],
        outputContexts: [
            {
                name: `${sessionId}/contexts/selecting_category`,
                lifespanCount: 10,
                parameters: { importer_option: selectedOption }
            }
        ]
    });
}


if (parameters.product_category) {
  const selectedCategory = parameters.product_category.toLowerCase();
  console.log("User selected category:", selectedCategory);

  let productOptions = [];
  if (selectedCategory === "agriculture machines") {
      productOptions = [
          { "text": "Tractor" }
      ];
  } else if (selectedCategory === "harvesting machines") {
      productOptions = [
          { "text": "Harvester" }
      ];
  } else if (selectedCategory === "construction equipment") {
      productOptions = [
          { "text": "Excavator" }
      ];
  }

  return res.json({
      fulfillmentMessages: [
          {
              "payload": {
                  "richContent": [
                      [
                          {
                              "title": `Selected Category: ${selectedCategory}`,
                              "type": "description",
                              "text": [
                                  "Now, please select a product:"
                              ]
                          },
                          {
                              "type": "chips",
                              "options": productOptions
                          }
                      ]
                  ]
              }
          }
      ]
  });
}


if (parameters.product) {
  const selectedProduct = parameters.product.toLowerCase();
  console.log("User selected product:", selectedProduct);

  let modelOptions = [];
  if (selectedProduct === "tractor") {
      modelOptions = [
          { "text": "Tractor X100" },
          { "text": "Tractor X200" }
      ];
  } else if (selectedProduct === "harvester") {
      modelOptions = [
          { "text": "Harvester Pro 500" },
          { "text": "Harvester Max 700" }
      ];
  } else if (selectedProduct === "excavator") {
      modelOptions = [
          { "text": "Excavator E300" },
          { "text": "Excavator E500" }
      ];
  }

  return res.json({
      fulfillmentMessages: [
          {
              "payload": {
                  "richContent": [
                      [
                          {
                              "title": `Selected Product: ${selectedProduct}`,
                              "type": "description",
                              "text": [
                                  "Now, please select a model:"
                              ]
                          },
                          {
                              "type": "chips",
                              "options": modelOptions
                          }
                      ]
                  ]
              }
          }
      ]
  });
}





  

    
    if (parameters.product_model) {
      if(!parameters.importer_option){
        const selectedModel = parameters.product_model.toLowerCase();
        const selectedOption = req.body.queryResult.outputContexts.find(ctx => ctx.name.includes("selecting_category"))?.parameters?.importer_option;
        
        console.log(`User selected model: ${selectedModel} for castum option: ${selectedOption}`);
  
        const query = `Provide ${selectedOption} for model ${selectedModel}, if it is present in the document`;
        const aiResponse = await generateAIResponse(query, contextText);
        return res.json({ fulfillmentText: aiResponse });
      }
      else{
        const selectedModel = parameters.product_model.toLowerCase();
        const selectedOption = parameters.importer_option;
        
        console.log(`User selected model: ${selectedModel} for parameter option: ${selectedOption}`);
  
        const query = `Provide ${selectedOption} for model ${selectedModel}, if it is present in the document. otherwise responde this product is not present in your data`;
        const aiResponse = await generateAIResponse(query, contextText);
        return res.json({ fulfillmentText: aiResponse }); 
      }
      
    }

    




  // do the following when there will be no data in context:
  // parameter based action based on first time:
//   if (parameters.user_role){
//     //In this we need to provide options:
//     const ur = parameters.user_role.toLowerCase();

//     if (ur === "importer") {
//       return res.json({ fulfillmentText: "Please provide your Importer ID for verification:" });
//     }
//     else if(ur === "customer"){
//       contextText = customers + "\n" + basicinfo; // Append Dealer & Customer data
//     }
//     else if(ur === "dealer"){
//       contextText =  dealers + "\n" + basicinfo; // Append Dealer & Customer data
//     }
      
//   }

  // for validating importer id
  



  // Step 4: Generate AI Response using updated context
  console.log("ContextTExt: ", contextText);
  const aiResponse = await generateAIResponse(userQuery, contextText);
  return res.json({ fulfillmentText: aiResponse });


});





app.listen(PORT, () => {
  console.log(`🚀 Webhook running on port ${PORT}`);
});

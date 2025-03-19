
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
  productdetails = await extractPDFText("./datafiles/product_details.pdf");
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
    console.clear();
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
                  { "text": "Gasoline Generators" },
                  { "text": "Gasoline Inverter Generators" },
                  { "text": "Gasoline Tillers" },
                  { "text": "Gasoline water Pumps" },
                  { "text": "Gasoline Engines" }
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
                  { "text": "BON-P-GG-18.5KW" },
                  
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
       
        contextText = productdetails + basicinfo;
        const query = `Provide details for model ${parameters.product_model}, if it is present in the document. otherwise responde 'Sorry, this product is not present in our data'`;
        const aiResponse = await generateAIResponse(query, contextText);
        return res.json({ fulfillmentText: aiResponse });
    
      }


        contextText = productdetails + basicinfo;
        const query = `Answer the query: ${userQuery}, if present in out context.`;
        const aiResponse = await generateAIResponse(query, contextText);
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





  if(userRole){
    const ur = userRole.toLowerCase();
    if (ur === "importer") {
      
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
    else if(ur === "customer"){
      contextText = customers + "\n" + basicinfo; // Append Dealer & Customer data
      
    }
    else if(ur === "dealer"){
      contextText =  dealers + "\n" + basicinfo; // Append Dealer & Customer data
      
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

    const aiResponse = await generateAIResponse(userQuery, contextText);
    return res.json({ fulfillmentText: aiResponse });

  }




  // do the following when there will be no data in context:
  // parameter based action based on first time:
  if (parameters.user_role){
    //In this we need to provide options:
    const ur = parameters.user_role.toLowerCase();

    if (ur === "importer") {
      return res.json({ fulfillmentText: "Please provide your Importer ID for verification:" });
    }
    else if(ur === "customer"){
      contextText = customers + "\n" + basicinfo; // Append Dealer & Customer data
    }
    else if(ur === "dealer"){
      contextText =  dealers + "\n" + basicinfo; // Append Dealer & Customer data
    }
      
  }

  // for validating importer id
  if (parameters.importer_id) {
    const importerID = String(parameters.importer_id).trim();
    console.log("I am in Parameter.importer, Your importer ID:", importerID);


    if (importerData.includes(importerID)) {
        console.log('I am in valid importer with session ID:', sessionId);
        
        return res.json({
            fulfillmentMessages: [
                {
                    "payload": {
                        "richContent": [
                            [
                                {
                                    "type": "description",
                                    "text": ["Now, please select a product category:"]
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
                                        { "text": "Sprayers and Fumigation" }
                                    ]
                                }
                            ]
                        ]
                    }
                }
            ],
            outputContexts: [  // ✅ Moved outputContexts outside of "payload"
                {
                    name: `${sessionId}/contexts/user_role_context`, 
                    lifespanCount: 50,
                    parameters: { 
                        user_role: "product segments"
                    }
                }
            ]
        });
        

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

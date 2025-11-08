const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000
require('dotenv').config() 
// Middleware 

app.use(express())
app.use(cors())
// ---------------------------MongoDB Connection String



const uri = process.env.MONGODB_URI;


const client = new MongoClient(uri, { // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try { 
    
    await client.connect();    // Connect the client to the server	(optional starting in v4.7)
    
    await client.db("admin").command({ ping: 1 }); // Send a ping to confirm a successful connection
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
    
  }
}
run().catch(console.dir);


// ---------------------------

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

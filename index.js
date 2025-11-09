const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000
require('dotenv').config() 
// Middleware 

app.use(express.json())
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

    const moviedb = client.db('movie_master_pro');
    const movies = moviedb.collection('movies');
    const users = moviedb.collection('users');

// -------------------- Get Api's

    app.get('/movies', async (req, res)=>{   // get all movies
        console.log('\n\n\n /movies was hit !!!!\n\n\n')

        const sort = req.query.sort;

        let movieData;

        if(sort=='top_rated'){
          movieData = await movies.find().sort({rating: -1}).limit(5).toArray()
        }else if(sort=='latest'){
          movieData = await movies.find().sort({ releaseYear: -1 }).limit(5).toArray()
        }else if(sort=='movie_count'){
          movieData = await movies.find().toArray()
          movieData=movieData.length
        }
        else{
          movieData = await movies.find().toArray()
        }
        res.send(movieData)
    })
    app.get('/movies/:id', async (req, res)=>{ // get all movies by ID
        const id = req.params;
        const query = { _id : new ObjectId(id) }
        console.log('\n\n\n /movies/id was hit !!!!\n\n\n')
        const movieData = await movies.findOne(query)
        res.send(movieData)
    })

    app.get('/users_count', async (req, res)=>{ // get all movies by ID
        console.log('\n\n\n /users_count was hit !!!!\n\n\n')
        const usersData = await users.find().toArray()
        res.send(usersData.length)
    })




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

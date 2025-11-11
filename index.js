const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();
// Middleware

app.use(express.json());
app.use(cors());
// ---------------------------MongoDB Connection String

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect(); // Connect the client to the server	(optional starting in v4.7)

    await client.db("admin").command({ ping: 1 }); // Send a ping to confirm a successful connection
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const moviedb = client.db("movie_master_pro");
    const movies = moviedb.collection("movies");
    const users = moviedb.collection("users");

    //-------------------- Firebase Admin

    var admin = require("firebase-admin");

    var serviceAccount = require("./movie-master-pro-49200-firebase-adminsdk.json");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    async function verifyToken(req, res, next) {
      // Firebase Admin Middleware for token verification
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res
          .status(401)
          .send({ message: "Unauthorized Access: No token provided" });
      }

      const token = authHeader.split(" ")[1]; //

      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
      } catch (error) {
        return res
          .status(403)
          .send({ message: "Unauthorized Access: Invalid token" });
      }
    }

    // -------------------- Get Api's

    app.get("/movies", async (req, res) => {
      // get all movies
      console.log("\n\n\n /movies was hit !!!!\n\n\n");

      const sort = req.query.sort;
      const email = req.query.email;
      const genre = req.query.genre;
      const minRating = req.query.minRating;
      let movieData;
      if (email) {
        const query = { addedBy: email };
        const result = await movies.find(query).toArray();
        return res.send(result);
      }
      if(genre || minRating){
        let query={}
        if(genre)  query.genre = genre
        if(minRating) query.rating = { $gte: parseFloat(minRating) };
        const result = await movies.find(query).toArray();
        return res.send(result);
      }
      if (sort == "top_rated") {
        movieData = await movies.find().sort({ rating: -1 }).limit(5).toArray();
      } else if (sort == "latest") {
        movieData = await movies
          .find()
          .sort({ releaseYear: -1 })
          .limit(6)
          .toArray();
      } else if (sort == "movie_count") {
        movieData = await movies.find().toArray();
        movieData = movieData.length;
      } else {
        movieData = await movies.find().toArray();
      }
      res.send(movieData);
    });
    app.get("/movies/:id", async (req, res) => {
      // get all movies by ID
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log("\n\n\n /movies/id was hit !!!!\n\n\n");
      const movieData = await movies.findOne(query);
      res.send(movieData);
    });

    app.get("/users_count", async (req, res) => {
      // get all movies by ID
      console.log("\n\n\n /users_count was hit !!!!\n\n\n");
      const usersData = await users.find().toArray();
      res.send(usersData.length);
    });
    app.get("/user", verifyToken, async (req, res) => {
      const email = req.user.email;
      if (!email) {
        return res.status(400).send({ message: "email not found in header" });
      }

      const query = { email: email };
      const result = await users.findOne(query);
      res.send(result);
    });
    // -------------------- Post Api's
    app.post("/users", verifyToken, async (req, res) => {
      console.log("/users was hit");
      const decodedUser = req.user;
      const { watchlist } = req.body;
      const email = decodedUser.email;
      // const user = req.body;
      const existingUser = await users.findOne({ email: email });
      if (existingUser) {
        return res.send({ message: "User already exists" });
      }
      const newUser = {
        email: email,
        name: decodedUser.name,
        uid: decodedUser.uid,
        photoUrl: decodedUser.picture,
        watchlist: watchlist || [],
      };
      const result = await users.insertOne(newUser);
      res.send(result);
    });

    app.post("/users/add-to-watchlist", verifyToken, async (req, res) => {
      const uid = req.user.uid;
      const { movieId } = req.body;
      if (!movieId) {
        res.status(400).send({ message: "movie id not found" });
      }
      const query = { uid: uid };
      const updateDoc = {
        $addToSet: { watchlist: movieId },
      };
      try {
        const result = await users.updateOne(query, updateDoc);
        if (result.matchedCount === 0)
          return res.status(404).send({ message: "user not found" });
        res.send({ message: "movie added to watchlist" });
      } catch (err) {
        console.log(err);
      }
    });
    app.post("/movies", verifyToken, async (req, res) => {
      try {
        const movieData = req.body;
        const email = req.user.email;
        const newMovie = {
          ...movieData,
          addedBy: email,
        };

        const result = await movies.insertOne(newMovie);
        res.send(result);
      } catch (error) {
        console.error("Error posting new movie:", error);
        res.status(500).send({ message: "Error adding movie" });
      }
    });
    // -------------------- Patch Api's
    app.patch("/users/remove-from-watchlist", verifyToken, async (req, res) => {
      const uid = req.user.uid;
      const { movieId } = req.body;
      if (!movieId) {
        res.status(400).send({ message: "movie id not found" });
      }
      const query = { uid: uid };
      const updateDoc = {
        $pull: { watchlist: movieId },
      };
      try {
        const result = await users.updateOne(query, updateDoc);
        if (result.matchedCount === 0)
          return res.status(404).send({ message: "user not found" });
        res.send({ message: "movie removed from watchlist" });
      } catch (err) {
        console.log(err);
      }
    });
    app.patch("/movies/:id", verifyToken, async (req, res) => {
      const movieId = req.params.id;
      const userEmail = req.user.email;
      const updatedData = req.body; 

      const query = { _id: new ObjectId(movieId) };

      try {
        const movie = await movies.findOne(query);

        if (!movie) {
          return res.status(404).send({ message: "Movie not found" });
        }

        if (movie.addedBy !== userEmail) {
          return res
            .status(403)
            .send({ message: "Forbidden: You cannot edit this movie." });
        }

        const updateDoc = {
          $set: updatedData,
        };
        const result = await movies.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error updating movie" });
      }
    });
    // -------------------- Delete Api's
    app.delete("/movies/:id", verifyToken, async (req, res) => {
      const movieId = req.params.id;
      const userEmail = req.user.email;
      const query = { _id: new ObjectId(movieId) };

      try {
        const movie = await movies.findOne(query);

        if (!movie) {
          return res.status(404).send({ message: "Movie not found" });
        }
        if (movie.addedBy !== userEmail) {
          return res.status(403).send({
            message: "unathorize access: You are not the owner of this movie.",
          });
        }
        const result = await movies.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error deleting movie" });
      }
    });
  } finally {
  }
}
run().catch(console.dir);

// -------------------- Delete Api's

// ---------------------------

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

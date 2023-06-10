const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ocimcqo.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();

		const usersCollection = client.db("jazzYogaDB").collection("users");
		const instructorCollector = client
			.db("jazzYogaDB")
			.collection("instructor");
		const reviewsCollector = client.db("jazzYogaDB").collection("reviews");
		const cartCollection = client.db("jazzYogaDB").collection("carts");

		app.get("/instructor", async (req, res) => {
			const result = await instructorCollector.find().toArray();
			res.send(result);
		});

		app.get("/reviews", async (req, res) => {
			const result = await reviewsCollector.find().toArray();
			res.send(result);
		});

		app.get("/carts", async (req, res) => {
			const email = req.query.email;
			if (!email) {
				res.send([]);
			}

			/* const decodedEmail = req.decoded.email;
			if (email !== decodedEmail) {
				return res
					.status(403)
					.send({ error: true, message: "forbidden access" });
			} */
			const query = { email: email };
			const result = await cartCollection.find(query).toArray();
			res.send(result);
		});

		app.post("/carts", async (req, res) => {
			const item = req.body;
			console.log(item);
			const result = await cartCollection.insertOne(item);
			res.send(result);
		});

		app.delete("/carts/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			console.log(query);
			const result = await cartCollection.deleteOne(query);
			res.send(result);
		});

		// User related APIs
		app.get("/users", async (req, res) => {
			const result = await usersCollection.find().toArray();
			res.send(result);
		});

		app.post("/users", async (req, res) => {
			const user = req.body;
			console.log(user);
			const query = {
				email: user.email,
			};
			const existingUser = await usersCollection.findOne(query);
			console.log("Existing User", existingUser);
			if (existingUser) {
				return res.send({ message: "User Already Exists" });
			}
			const result = await usersCollection.insertOne(user);
			res.send(result);
		});

		app.patch("/users/admin/:id", async (req, res) => {
			const id = req.params.id;
			console.log(id);
			const filter = { _id: new ObjectId(id) };
			const updateDoc = {
				$set: {
					role: "admin",
				},
			};
			const result = await usersCollection.updateOne(filter, updateDoc);
			res.send(result);
		});

		app.patch("/users/instructor/:id", async (req, res) => {
			const id = req.params.id;
			console.log(id);
			const filter = { _id: new ObjectId(id) };
			const updateDoc = {
				$set: {
					role: "instructor",
				},
			};
			const result = await usersCollection.updateOne(filter, updateDoc);
			res.send(result);
		});

		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log(
			"Pinged your deployment. You successfully connected to MongoDB!"
		);
	} finally {
		// await client.close();
	}
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("JazzYogaCamp is Running.....");
});

app.listen(port, () => {
	console.log(`JazzYogaCamp is Running on the PORT: ${port}`);
});

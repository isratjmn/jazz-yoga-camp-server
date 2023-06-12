const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const verifyJWT = (req, res, next) => {
	const authorization = req.headers.authorization;
	if (!authorization) {
		return res
			.status(401)
			.send({ error: true, message: "unauthorized access" });
	}
	// BEARER TOKEN
	const token = authorization.split(" ")[1];
	jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
		if (err) {
			return res
				.status(401)
				.send({ error: true, message: "unauthorized access" });
		}
		req.decoded = decoded;
		next();
	});
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ocimcqo.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		client.connect();

		const usersCollection = client.db("jazzYogaDB").collection("users");
		const instructorCollector = client
			.db("jazzYogaDB")
			.collection("instructor");
		const reviewsCollector = client.db("jazzYogaDB").collection("reviews");
		const cartCollection = client.db("jazzYogaDB").collection("carts");
		const classesCollection = client.db("jazzYogaDB").collection("classes");

		app.post("/jwt", (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
				expiresIn: "1h",
			});
			res.send({ token });
		});

		const verifyAdmin = async (req, res, next) => {
			const email = req.decoded.email;
			const query = { email: email };
			const user = await usersCollection.findOne(query);
			if (user?.role !== "admin") {
				return res
					.status(403)
					.send({ error: true, message: "forbidden message" });
			}
			next();
		};

		app.get("/instructor", async (req, res) => {
			const result = await instructorCollector.find().toArray();
			res.send(result);
		});

		app.get("/reviews", async (req, res) => {
			const result = await reviewsCollector.find().toArray();
			res.send(result);
		});
		app.get("/classes", async (req, res) => {
			const result = await classesCollection.find().toArray();
			res.send(result);
		});

		app.post("/classes", async (req, res) => {
			const newItem = req.body;
			console.log(newItem);
			const result = await classesCollection.insertOne(newItem);
			res.send(result);
		});

		app.patch("/classes/:id/status", async (req, res) => {
			const id = req.params.id;
			const { status } = req.body;
			console.log(id, status);

			const filter = { _id: new ObjectId(id) };
			const updateDoc = {
				$set: {
					status: status,
				},
			};

			const result = await classesCollection.updateOne(filter, updateDoc);
			res.send(result);
		});

		/* app.patch("/classes/:id/status", async (req, res) => {
			try {
				const id = req.params.id;
				const { status } = req.body;

				const filter = { _id: ObjectId(id) };
				const updateDoc = { $set: { status } };

				const result = await classesCollection.updateOne(
					filter,
					updateDoc
				);

				if (result.matchedCount === 0) {
					return res.status(404).json({ message: "Class not found" });
				}

				res.json({ message: "Class status updated successfully" });
			} catch (error) {
				console.error(error);
				res.status(500).json({ message: "Internal server error" });
			}
		}); */

		app.get("/carts", verifyJWT, async (req, res) => {
			const email = req.query.email;
			if (!email) {
				res.send([]);
			}

			const decodedEmail = req.decoded.email;
			if (email !== decodedEmail) {
				return res
					.status(403)
					.send({ error: true, message: "forbidden access" });
			}
			const query = { email: email };
			const result = await cartCollection.find(query).toArray();
			res.send(result);
		});

		app.post("/carts", async (req, res) => {
			const newItem = req.body;
			console.log(newItem);
			const result = await cartCollection.insertOne(newItem);
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
		app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
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

		app.get("/users/admin/:email", verifyJWT, async (req, res) => {
			const email = req.params.email;
			if (req.decoded.email !== email) {
				res.send({ admin: false });
			}
			const query = { email: email };
			const user = await usersCollection.findOne(query);
			const result = {
				admin: user?.role === "admin",
			};
			res.send(result);
		});

		/*app.get("/classes", async (req, res) => {
			try {
				const classes = await usersCollection.find().toArray();
				res.send(classes);
			} catch (error) {
				console.log(error);
				res.status(500).send("Internal Server Error");
			}
		}); */

		app.get("/users/instructor/:email", async (req, res) => {
			const email = req.params.email;
			const user = await usersCollection.findOne({ email: email });
			const isInstructor = user && user.role === "instructor";
			res.json({ instructor: isInstructor });
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

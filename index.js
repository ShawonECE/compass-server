const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 3000;
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET);

// middlewares
app.use(cors(
  {
    origin: ['http://localhost:5173'],
  }
));
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5yhhqym.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const db = client.db("compass");
const packageColl = db.collection("packages");
const userColl = db.collection("users");
const guideColl = db.collection("guides");
const storyColl = db.collection("stories");
const bookingColl = db.collection("bookings");

// const verifyToken = (req, res, next) => {
//   const token = req.cookies?.token;
//   console.log(token);
//   if (!token) {
//     console.log('No token');
//     return res.status(401).send({message: 'unauthorized access'});
//   }
//   jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//     if (err) {
//       console.log('Invalid token');
//       return res.status(401).send({message: 'unauthorized access'});
//     }
//     req.user = decoded;
//     next();
//   });
// };

async function run() {
  try {
    await client.connect();

    app.post('/jwt', async (req, res) => {
      const email = req.body.email;
      const token = jwt.sign({ data: email }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.send({ token });
    });

    app.get('/', async (req, res) => {
      res.send('Welcome to compass');
    });
    
    app.get('/packages', async (req, res) => {
      const limit = parseInt(req.query?.limit);
      const tourType = req.query?.tourType;
      let result;
      if (limit) {
        result = await packageColl.find().limit(limit).toArray();
      } else if (tourType) {
        result = await packageColl.find({ tourType: tourType}).toArray();
      } else {
        result = await packageColl.find().toArray();
      }
      res.send(result);
    });

    app.get('/package/:id', async (req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await packageColl.findOne({ _id: id });
      res.send(result);
    });

    app.post('/user', async (req, res) => {
      const email = req.body.email;
      const user = await userColl.findOne({ email: email });
      if (!user) {
        const result = await userColl.insertOne({ email: email, role: 'user' });
        res.send(result);
      } else {
        res.send({message: 'user already exist', insertedId: undefined});
      }
    });

    app.get('/users', async (req, res) => {
      const email = req.query?.email;
      let result;
      if (email) {
        result = await userColl.findOne({ email: email });
      } else {
        result = await userColl.find().toArray();
      }
      res.send(result);
    });

    app.get('/guides', async (req, res) => {
      const result = await guideColl.find().toArray();
      res.send(result);
    });

    app.get('/guide/:id', async (req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await guideColl.findOne({ _id: id });
      res.send(result);
    });

    app.get('/stories', async (req, res) => {
      const limit = parseInt(req.query?.limit);
      let result;
      if (limit) {
        result = await storyColl.find().limit(limit).toArray();
      } else {
        result = await storyColl.find().toArray();
      }
      res.send(result);
    });

    app.get('/story/:id', async (req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await storyColl.findOne({ _id: id });
      res.send(result);
    });

    app.post('/story', async (req, res) => {
      const data = req.body;
      const result = await storyColl.insertOne( data );
      res.send(result);
    });

    app.post('/booking', async (req, res) => {
      const data = req.body;
      const result = await bookingColl.insertOne(data);
      res.send(result);
    });

    app.patch('/rating', async (req, res) => {
      const data = req.body;
      const guideId = new ObjectId(data.guideId);
      const updateDoc = {
        $set: {
          feedback: data.newFeedback
        },
      };
      const result = await guideColl.updateOne({_id: guideId}, updateDoc, { upsert: true });
      res.send(result);
    });
  } 
  finally {
    
  }
}
run().catch(console.dir);

app.listen(port);
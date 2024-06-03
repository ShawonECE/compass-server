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
        const result = limit ? await packageColl.find().limit(limit).toArray() : await packageColl.find().toArray();
        res.send(result);
    });

    app.get('/package/:id', async (req, res) => {
        const id = new ObjectId(req.params.id);
        const result = await packageColl.findOne({ _id: id });
        res.send(result);
    });
  } 
  finally {
    
  }
}
run().catch(console.dir);

app.listen(port);
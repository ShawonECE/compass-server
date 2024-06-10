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
    origin: ['http://localhost:5173', 'https://compass-55799.web.app', 'https://compass-55799.firebaseapp.com'],
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
const wishColl = db.collection("wishlist");
const reqColl = db.collection("guide-requests");
const paymentColl = db.collection("payments");
const blogColl = db.collection("blogs");
const messageColl = db.collection("messages");

const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  // console.log(token);
  if (!token) {
    // console.log('No token');
    return res.status(401).send({message: 'unauthorized access'});
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // console.log('Invalid token');
      return res.status(401).send({message: 'unauthorized access'});
    }
    // console.log(decoded);
    req.decoded = decoded;
    next();
  });
};

const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.data;
  const query = { email: email };
  // console.log(email);
  const user = await userColl.findOne(query);
  // console.log(user);
  const isAdmin = user?.role === 'admin';
  if (!isAdmin) {
    // console.log('not admin');
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
}

const verifyGuide = async (req, res, next) => {
  const email = req.decoded.data;
  const query = { email: email };
  // console.log(email);
  const user = await userColl.findOne(query);
  // console.log(user);
  const isGuide = user?.role === 'guide';
  if (!isGuide) {
    // console.log('not admin');
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
}


async function run() {
  try {
    // await client.connect();

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

    app.post('/package', verifyToken, verifyAdmin, async (req, res) => {
      const data = req.body;
      const result = await packageColl.insertOne(data);
      res.send(result);
    });

    app.post('/user', async (req, res) => {
      const data = req.body;
      const email = data.email;
      const user = await userColl.findOne({ email: email });
      if (!user && data.email && data.name) {
        data.role = 'user';
        const result = await userColl.insertOne(data);
        res.send(result);
      } else {
        res.send({ insertedId: undefined });
      }
    });

    app.get('/user', async (req, res) => {
      const email = req.query?.email;
      const result = await userColl.findOne({ email: email });
      res.send(result);
    });

    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const role = req.query?.role;
      const keyword = req.query?.keyword;
      let result;
      
      if (role) {
        if (role) {
          const pipeline = [{ $match: { role: role } }];
          result = await userColl.aggregate(pipeline).toArray();
        }
      } else {
        result = await userColl.find().toArray();
      }

      if (keyword) {
        let filtered = result.filter(user => user.name.toLowerCase().includes(keyword) || user.email.toLowerCase().includes(keyword));
        return res.send(filtered);
      }
      res.send(result);
    });

    app.patch('/change-role', verifyToken, verifyAdmin, async (req, res) => {
      const data = req.body;
      const updateDoc = {
        $set: {
          role: data.role
        },
      };
      const result = await userColl.updateOne({email: req.body.email}, updateDoc, { upsert: true });
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

    app.get('/guide-profile', verifyToken, verifyGuide, async (req, res) => {
      const email = req.query.email;
      const result = await guideColl.findOne({ email: email });
      res.send(result);
    });

    app.post('/guide', verifyToken, verifyAdmin, async (req, res) => {
      const data = req.body;
      const result = await guideColl.insertOne(data);
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

    app.get('/bookings', verifyToken, async (req, res) => {
      const email = req.query?.email;
      if (email !== req.decoded.data) {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      const result = await bookingColl.find({ email: email }).toArray();
      res.send(result);
    });

    app.get('/assigned-bookings', verifyToken, verifyGuide, async (req, res) => {
      const id = req.query.guideId;
      const result = await bookingColl.find({ guideId: id }).toArray();
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

    app.patch('/status', verifyToken, verifyGuide, async (req, res) => {
      const data = req.body;
      const bookingId = new ObjectId(data.bookingId);
      const updateDoc = {
        $set: {
          status: data.status
        },
      };
      const result = await bookingColl.updateOne({_id: bookingId}, updateDoc, { upsert: true });
      res.send(result);
    });

    app.patch('/confirm-booking', async (req, res) => {
      const data = req.body;
      const bookingId = new ObjectId(data.bookingId);
      const updateDoc = {
        $set: {
          status: 'paid'
        },
      };
      const result = await bookingColl.updateOne({_id: bookingId}, updateDoc, { upsert: true });
      res.send(result);
    });

    app.delete('/booking/:id', async (req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await bookingColl.deleteOne({_id: id});
      res.send(result);
    });

    app.post('/wishlist', async (req, res) => {
      const data = req.body;
      const result = await wishColl.insertOne(data);
      res.send(result);
    });

    app.get('/wishlist', verifyToken, async (req, res) => {
      const email = req.query?.email;
      if (email !== req.decoded.data) {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      const result = await wishColl.find({ email: email }).toArray();
      res.send(result);
    });

    app.delete('/wishlist/:id', async (req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await wishColl.deleteOne({_id: id});
      res.send(result);
    });

    app.post('/guide-request', async (req, res) => {
      const data = req.body;
      const result = await reqColl.insertOne( data );
      res.send(result);
    });

    app.get('/guide-request', verifyToken, async (req, res) => {
      const email = req.query?.email;
      if (email !== req.decoded.data) {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      const result = await reqColl.findOne({ email: email });
      if (result?._id) {
        res.send({ requested: true });
      } else {
        res.send({ requested: false });
      }  
    });

    app.get('/all-guide-request', verifyToken, verifyAdmin, async (req, res) => {
      const result = await reqColl.find().toArray();
      res.send(result);
    });

    app.delete('/guide-request', verifyToken, verifyAdmin, async (req, res) => {
      const email = req.query.email;
      const result = await reqColl.deleteOne({email: email});
      res.send(result);
    });

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    }); 

    app.post('/payments', async (req, res) => {
      const data = req.body;
      const result = await paymentColl.insertOne( data );
      res.send(result);
    });

    app.get('/blogs', async (req, res) => {
      const result = await blogColl.find().toArray();
      res.send(result);
    });

    app.get('/blog/:id', async (req, res) => {
      const id = new ObjectId(req.params.id);
      const result = await blogColl.findOne({ _id: id });
      res.send(result);
    });

    app.post('/message', async (req, res) => {
      const data = req.body;
      const result = await messageColl.insertOne(data);
      res.send(result);
    });
  } 
  finally {
    
  }
}
run().catch(console.dir);

app.listen(port);
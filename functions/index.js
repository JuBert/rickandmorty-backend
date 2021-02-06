const functions = require('firebase-functions');
const app = require('express')();
const FBAuth = require('./util/fbAuth');
const config = require('./util/config');

const {
  getFavCharacters,
  postNewFavorite,
  signup,
  login,
} = require('./routes');

// Get FavCharacters route
app.get('/favorites', getFavCharacters);
// Post new favourite
app.post('/favorite', FBAuth, postNewFavorite);

// Signup Route
app.post('/signup', signup);

// Login route
app.post('/login', login);

exports.api = functions.region('europe-west1').https.onRequest(app);

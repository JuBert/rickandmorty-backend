const functions = require('firebase-functions');
const express = require('express');
const app = express();
const FBAuth = require('./util/fbAuth');

const {
  getCharacters,
  getFavCharacters,
  addNewFavorite,
  signup,
  login,
} = require('./routes');

// Characters route
app.get('/characters', FBAuth, getCharacters); // get all characters
app.get('/favorites', FBAuth, getFavCharacters); // get 1 user's favs
app.get('/characters/:favoriteId', FBAuth, addNewFavorite); // get old favs, push new fav

// User Routes
app.post('/signup', signup);
app.post('/login', login);

exports.api = functions.region('europe-west1').https.onRequest(app);

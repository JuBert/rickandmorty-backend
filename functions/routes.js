const { db } = require('./util/admin');
const config = require('./util/config');
const firebase = require('firebase');
const axios = require('axios');
firebase.initializeApp(config);

const { validateSignupData, validateLoginData } = require('./util/validators');

// GET R&M CHARACTERS

exports.getCharacters = (req, res) => {
  axios
    .get('https://rickandmortyapi.com/api/character/')
    .then((response) => {
      let result = [];
      result = response.data;
      return res.status(200).json(result);
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
    });
};

// GET USER INFO - FAVORITE CHARACTERS
exports.getFavCharacters = (req, res) => {
  let favoriteCharacters;
  db.doc(`/users/${req.user.handle}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      favoriteCharacters = doc.data().favCharacters;
      return favoriteCharacters;
    })
    .then(() => {
      const url = 'https://rickandmortyapi.com/api/character/';
      const favoriteUrl = url.concat(favoriteCharacters);
      return axios.get(favoriteUrl).then((response) => {
        let result = [];
        result = response.data;
        return res.status(200).json(result);
      });
    })
    .catch((err) => {
      res.status(500).json({
        error: err,
      });
      console.log(err);
    });
};

// ADD REMOVE FAVORITE CHARACTERS
exports.addNewFavorite = (req, res) => {
  // Get new favorite character and save in new array
  const newStringCharacterId = req.params.favoriteId;
  const newNumberCharacterId = parseInt(newStringCharacterId);
  const newFav = [];
  newFav.push(newNumberCharacterId);

  // Get existing favorites array and push new favorite / remove it if duplicate
  let updatedFavs = [];
  let newFavorite = {};
  db.doc(`/users/${req.user.handle}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      let { favCharacters } = doc.data();
      if (favCharacters.some((characters) => newFav.includes(characters))) {
        updatedFavs = favCharacters.filter((item) => !newFav.includes(item));
      } else {
        updatedFavs = favCharacters.concat(newFav);
      }
      newFavorite = {
        favCharacters: updatedFavs,
      };
      return db
        .doc(`/users/${req.user.handle}`)
        .update(newFavorite)
        .then(() => {
          return res
            .status(200)
            .json({ message: `document updated succesfully` });
        });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// SIGNUP
exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };
  // Validation
  const { valid, errors } = validateSignupData(newUser);
  if (!valid) return res.status(400).json(errors);

  // User Creation - Post data DB
  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(400).json({ handle: 'Username already taken' });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId,
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        return res.status(400).json({ email: 'Email already in use' });
      } else {
        return res
          .status(500)
          .json({ general: 'Something went wrong, please try again' });
      }
    });
};

// LOGIN
exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  // Validate data
  const { valid, errors } = validateLoginData(user);
  if (!valid) return res.status(400).json(errors);
  // Login
  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((err) => {
      console.error(err);
      return res.status(403).json({ general: 'Wrong credentials' });
    });
};

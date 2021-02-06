const { db } = require('./util/admin');
const config = require('./util/config');
const firebase = require('firebase');
firebase.initializeApp(config);

const { validateSignupData, validateLoginData } = require('./util/validators');

// GET USER INFO - FAVORITE CHARACTERS
exports.getFavCharacters = (req, res) => {
  db.collection('users')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let favorites = [];
      data.forEach((doc) => {
        favorites.push({
          userName: doc.id,
          favCharacters: doc.data().favCharacters,
          createdAt: doc.data().createdAt,
        });
      });
      return res.json(favorites);
    })
    .catch((err) => console.error(err));
};

// POST USER INFO - FAVORITE CHARACTERS
exports.postNewFavorite = (req, res) => {
  const newFavorite = {
    favCharacters: req.body.favCharacters,
  };

  db.doc(`/users/${req.user.handle}`)
    .update(newFavorite)
    .then(() => {
      return res.json({ message: `document updated succesfully` });
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

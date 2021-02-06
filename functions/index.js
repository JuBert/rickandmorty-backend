const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();
const config = require('./util/config');

admin.initializeApp();

const firebase = require('firebase');
firebase.initializeApp(config);

const db = admin.firestore();

// Get user data
app.get('/favorites', (req, res) => {
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
});

const FBAuth = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else {
    console.error('No token found');
    return res.status(403).json({ error: 'Unauthorized' });
  }
  return admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      console.log(decodedToken);
      return db
        .collection('users')
        .where('userId', '==', req.user.uid)
        .limit(1)
        .get()
        .then((data) => {
          req.user.handle = data.docs[0].data().handle;
          return next();
        })
        .catch((err) => {
          console.error('Error while verifying token', err);
          return res.status(403).json({ error: 'Error while verifying token' });
        });
    });
};

// Add new favorite character
// app.post('/favorite', FBAuth, (req, res) => {
//   const newFavorite = {
//     favCharacter: req.body.favCharacter,
//     userHandle: req.user.handle,
//     createdAt: new Date().toISOString(),
//   };

//   db.collection('favorites')
//     .add(newFavorite)
//     .then((doc) => {
//       return res.json({ message: `document ${doc.id} created succesfully` });
//     })
//     .catch((err) => {
//       res.status(500).json({ error: 'something went wrong' });
//       console.error(err);
//     });
// });

app.post('/favorite', FBAuth, (req, res) => {
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
});

// const isEmail = (email) => {
//   const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
//   if (email.match(regEx)) return true;
//   else return false;
// };

const isEmpty = (string) => {
  if (string.trim() === '') return true;
  else return false;
};

// Signup Route
app.post('/signup', (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  // Data validation
  let errors = {};

  // if (isEmpty(newUser.email)) {
  //   errors.email = 'Mandatory info';
  // } else if (!isEmail(newUser.email)) {
  //   errors.email = 'Not valid email';
  // }

  if (isEmpty(newUser.email)) errors.email = 'Mandatory info';
  if (isEmpty(newUser.password)) errors.password = 'Mandatory info';
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = 'Passwords not matching';
  if (isEmpty(newUser.handle)) errors.handle = 'Mandatory info';

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  // Posting data to firestore
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
        return res.status(500).json({ error: err.code });
      }
    });
});

// Login route
app.post('/login', (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  let errors = {};

  if (isEmpty(user.email)) errors.email = 'Must not be empty';
  if (isEmpty(user.password)) errors.password = 'Must not be empty';

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

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
      if (err.code === 'auth/wrong-password') {
        return res.status(403).json({ general: 'Wrong credentials' });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
});

exports.api = functions.region('europe-west1').https.onRequest(app);

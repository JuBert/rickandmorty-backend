// const isEmail = (email) => {
//   const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
//   if (email.match(regEx)) return true;
//   else return false;
// };

const isEmpty = (string) => {
  if (string.trim() === '') return true;
  else return false;
};

exports.validateSignupData = (data) => {
  let errors = {};

  // if (isEmpty(newUser.email)) {
  //   errors.email = 'Mandatory info';
  // } else if (!isEmail(newUser.email)) {
  //   errors.email = 'Not valid email';
  // }

  if (isEmpty(data.email)) errors.email = 'Mandatory info';
  if (isEmpty(data.password)) errors.password = 'Mandatory info';
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = 'Passwords not matching';
  if (isEmpty(data.handle)) errors.handle = 'Mandatory info';

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.validateLoginData = (data) => {
  let errors = {};

  if (isEmpty(data.email)) errors.email = 'Must not be empty';
  if (isEmpty(data.password)) errors.password = 'Must not be empty';

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

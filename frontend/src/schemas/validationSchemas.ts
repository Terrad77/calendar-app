import * as yup from 'yup';

export const signUpSchema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup
    .string()
    .min(8, 'password_min_length')
    .matches(/[A-Z]/, 'password_uppercase_required')
    .matches(/[a-z]/, 'password_lowercase_required')
    .matches(/[0-9]/, 'password_number_required')
    .required('Password is required'),
  repeatPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Repeat Password is required'),
});

export const signInSchema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

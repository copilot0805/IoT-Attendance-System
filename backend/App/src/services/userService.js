require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const saltRounds = 10;



const loginService = async (email, password) => {
    try {
        // fetch user by email
        console.log('Qua login service: ', email, '-', password);
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email])
            .then(res => res.rows[0])
            .catch(err => {
                console.log(err);
                return null;
            });
        if (user) {
            // compare password
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (isMatch) {
                const payload = {
                    email: user.email,
                    name: user.full_name,
                    role: user.role
                }

                const access_token = jwt.sign(payload,
                    process.env.JWT_SECRET,
                    {
                        expiresIn: process.env.JWT_EXPIRE
                    }
                )
                return {
                    EC: 0,
                    access_token,
                    user: {
                        email: user.email,
                        name: user.name,
                        role: user.role
                    }
                }
            } else {
                return {
                    EC: 2,
                    EM: "Email/Password không hợp lệ"
                }
            }
        } else {
            return {
                EC: 1,
                EM: "Email/Password không hợp lệ"
            }
        }


    } catch (error) {
        console.log(error);
        return null;
    }
}

module.exports = {
    loginService
}
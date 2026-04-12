// const bcrypt = require('bcryptjs');
// const pool = require('../db');

// const getUsersAPI = async (req, res) => {
//     try {
//         const result = await pool.query(
//             `SELECT user_id, full_name, email, role, created_at, updated_at
//              FROM users
//              ORDER BY created_at DESC`
//         );
//         return res.json({ data: result.rows });
//     } catch (error) {
//         console.error('getUsersAPI error:', error);
//         return res.status(500).json({ error: 'Unable to fetch users' });
//     }
// };

// const postCreateUserAPI = async (req, res) => {
//     try {
//         const { full_name, email, password, role } = req.body;

//         if (!full_name || !email || !password) {
//             return res.status(400).json({ error: 'full_name, email and password are required' });
//         }

//         const password_hash = await bcrypt.hash(password, 10);
//         const result = await pool.query(
//             `INSERT INTO users (full_name, email, password_hash, role)
//              VALUES ($1, $2, $3, $4)
//              RETURNING user_id, full_name, email, role, created_at, updated_at`,
//             [full_name, email, password_hash, role || 'EMPLOYEE']
//         );

//         return res.status(201).json({ data: result.rows[0] });
//     } catch (error) {
//         console.error('postCreateUserAPI error:', error);
//         return res.status(500).json({ error: 'Unable to create user' });
//     }
// };

// const putUpdateUserAPI = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { full_name, email, role } = req.body;

//         const result = await pool.query(
//             `UPDATE users
//              SET full_name = $1,
//                  email = $2,
//                  role = $3,
//                  updated_at = NOW()
//              WHERE user_id = $4
//              RETURNING user_id, full_name, email, role, created_at, updated_at`,
//             [full_name, email, role, id]
//         );

//         if (result.rowCount === 0) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         return res.json({ data: result.rows[0] });
//     } catch (error) {
//         console.error('putUpdateUserAPI error:', error);
//         return res.status(500).json({ error: 'Unable to update user' });
//     }
// };

// const deleteUserAPI = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const result = await pool.query(`DELETE FROM users WHERE user_id = $1`, [id]);

//         if (result.rowCount === 0) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         return res.json({ message: 'User deleted' });
//     } catch (error) {
//         console.error('deleteUserAPI error:', error);
//         return res.status(500).json({ error: 'Unable to delete user' });
//     }
// };

// module.exports = {
//     getUsersAPI,
//     postCreateUserAPI,
//     putUpdateUserAPI,
//     deleteUserAPI
// };

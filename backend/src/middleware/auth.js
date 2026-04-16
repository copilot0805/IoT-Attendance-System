const jwt = require('jsonwebtoken');
require("dotenv").config();


const auth = (req, res, next) => {
    // Check if the request path is in the white list
    const white_lists = ["/", "/login"];
    //console.log(">>>check url:", req.originalUrl);
    if (white_lists.find(item => '/v1/api' + item === req.originalUrl)) {
        next();

    }
    else {
        if (req.headers && req.headers.authorization) {
            // Token from header
            const token = req.headers.authorization.split(" ")[1];

            //verify
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET,)
                req.user = {
                    email: decoded.email,
                    name: decoded.name,
                    role: decoded.role
                }


                // console.log("Decoded token:", decoded);
                // console.log("Token nhận:", token);
                next();

            } catch (errol) {
                return res.status(401).json({
                    message: "Token không hợp lệ hoặc đã hết hạn"
                })
            }

        } else {
            return res.status(401).json({
                message: "Chưa truyền access token ở header/token hết hạn"
            })
        }
    }

};

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        console.log("Qua check role")
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            console.log(">>>check user role:", req.user);
            return res.status(403).json({
                message: "Bạn không có quyền truy cập chức năng này!"
            });
        }
        next();
    };
};

module.exports = {
    auth,
    checkRole
};
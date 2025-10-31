module.exports = function serviceAuth(req, res, next) {
    const auth = req.headers.authorization || "";
    const token = process.env.BACKEND_TOKEN;
    if (!token)
        return res
            .status(500)
            .json({ error: "Server misconfigured: no BACKEND_TOKEN" });
    if (auth !== `Bearer ${token}`)
        return res.status(403).json({ error: "Forbidden" });
    next();
};

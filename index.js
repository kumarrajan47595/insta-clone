import express, { urlencoded } from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./utilis/connectDB.js";
import userRoute from "./routes/user.route.js"
import postRoute from "./routes/post.route.js"
import messageRoute from "./routes/message.route.js"
import { app,server } from "./socket/socket.js";
dotenv.config({});
connectDB();

app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());
app.use(urlencoded({ extended: true }));
app.use(cors({
    origin: 'http://localhost:5173',  // Allow requests from your frontend
    credentials: true,                // Allow cookies or credentials to be included
    methods: 'GET,POST,PUT,DELETE',   // Allow these HTTP methods
    allowedHeaders: 'Content-Type,Authorization'  // Allow custom headers
}));

const PORT = process.env.PORT;
app.get("/", (req, res) => {
    res.send("hello world");
})
//middleware
app.use("/api/v1/users", userRoute);
app.use("/api/v1/posts",postRoute);
app.use("/api/v1/messages",messageRoute);
server.listen(PORT, () => {
    console.log(`server is listing on ${PORT}`)
})
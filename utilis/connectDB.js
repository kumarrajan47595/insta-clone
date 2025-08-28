import mongoose from "mongoose";

const connectDB=async()=>{
    try {
        await mongoose.connect(process.env.MONGOOSE_URl)
        console.log("Database connected")
    } catch (error) {
        console.log("Error in connect DB",error)
    }
}

export default connectDB;
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utilis/datauri.js";
import cloudinary from "../utilis/cloudinary.js";
import { Post } from "../models/post.model.js";

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(401).json({
                message: "All fields are required",
                success: false,
            })
        }
        const user = await User.findOne({ email });
        if (user) {
            return res.status(401).json({
                message: "Email allready registered",
                success: false
            })
        }
        const users = await User.findOne({ username });
        if (users) {
            return res.status(401).json({
                message: "Username allready existed",
                success: false
            })
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            username,
            email,
            password: hashedPassword,
        });
        return res.status(200).json({
            message: "Account created successfully",
            success: true
        })
    } catch (error) {
        console.log("Error in register", error);;
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({
                message: "All field are reqiured",
                success: false
            })
        }
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: "User not registerd",
                success: false,
            })
        }
        const checkpassword = await bcrypt.compare(password, user.password);
        if (!checkpassword) {
            return res.status(401).json({
                message: "invalid credetials",
                success: false
            })
        }
        const token = await jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: "1d" });
        const populatedPosts = await Promise.all(
            user.posts.map(async (postId) => {
                const post = await Post.findById(postId);
                if (post.author.equals(user._id)) {
                    return post;
                }
                return null;
            })
        )
        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: populatedPosts
        }
        console.log(token);
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,  // Only send over HTTPS
            sameSite: 'Strict',  // Adjust SameSite based on your needs
            maxAge: 3600000,  // 1 hour

        });

        // Send the token back in the response body (for localStorage)
        res.status(200).json({
            token, message: `Welcome back ${user.username}`,
            success: true,
            user
        });
    } catch (error) {
        console.log("Error in login ", error);
    }
}

export const logout = async (req, res) => {
    try {
        return res.cookie("token", "", { maxAge: 0 }).json({
            message: "Logged out successfully",
            success: true
        })
    } catch (error) {
        console.log("Error in logout ", error)
    }
}

export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).populate({ path: 'posts', createdAt: -1 }).populate('bookmarks');
        if (!user) {
            res.status(401).json({
                message: "User not exist",
                success: false
            })
        }
        res.status(200).json({
            message: "found user profile",
            success: true,
            user
        })
    } catch (error) {
        console.log("Error in getProfile", error);
    }
}

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio, gender } = req.body;
        const profilePicture = req.file;
        console.log(profilePicture);
        let cloudResponse;
        if (profilePicture) {
            const fileuri = getDataUri(profilePicture);
            // console.log(fileuri);
            cloudResponse = await cloudinary.uploader.upload(fileuri);
            console.log(cloudResponse);
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            })
        }
        if (bio) user.bio = bio;
        if (gender) user.gender = gender;
        if (profilePicture) user.profilePicture = cloudResponse.secure_url;
        await user.save();
        return res.status(200).json({
            message: "Profile updated",
            success: true,
            user
        })
        // return res.json({
        //     message: req.files.file
        // })
    } catch (error) {
        console.log("Error in edit Profile", error);
    }
}

export const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({ _id: { $ne: req.id } }).select("-password");
        if (!suggestedUsers) {
            return res.status(400).json({
                message: "Currently do not have any users",
            })
        }
        return res.status(200).json({
            success: true,
            users: suggestedUsers
        })
    } catch (error) {
        console.log("Error in suggested user", error);
    }
}
export const followOrUnfollow = async (req, res) => {
    try {
        const followKrneWala = req.id;
        const jiskofollowKrunga = req.params.id;
        if (followKrneWala == jiskofollowKrunga) {
            return res.status(400).json({
                message: "You can't follow/infollow yourself",
                success: false
            })
        }
        const user = await User.findById(followKrneWala);
        const targetUser = await User.findById(jiskofollowKrunga);
        if (!user || !targetUser) {
            return res.status(400).json({
                message: "User not exist",
                success: false
            })
        }
        const isfollowing = user.following.includes(jiskofollowKrunga);
        if (isfollowing) {
            //unfollow
            await Promise.all([
                User.updateOne({ _id: followKrneWala }, { $pull: { following: jiskofollowKrunga } }),
                User.updateOne({ _id: jiskofollowKrunga }, { $pull: { followers: followKrneWala } })
            ])
            return res.status(200).json({
                message: "unfollowed successfully",
                User
            })
        } else {
            //follow
            await Promise.all([
                User.updateOne({ _id: followKrneWala }, { $push: { following: jiskofollowKrunga } }),
                User.updateOne({ _id: jiskofollowKrunga }, { $push: { followers: followKrneWala } })
            ])
            return res.status(200).json({
                message: "followed successfully",
                User
            })
        }
    } catch (error) {
        console.log("Error in followUnfollow", error);
    }
}
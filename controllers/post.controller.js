import sharp from "sharp";
import cloudinary from "../utilis/cloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

export const addNewPost = async (req, res) => {
    try {
        const authorId = req.id;
        const { caption } = req.body;
        const image = req.file;
        if (!image) {
            return res.status(400).json({
                message: "Image is required",
                success: true
            })
        }
        //image upload
        const optimisedImageBuffer = await sharp(image.buffer)
            .resize({ width: 800, height: 800, fit: 'inside' })
            .toFormat('jpeg', { quality: 80 })
            .toBuffer();
        //image to datauri
        const fileUri = `data:image/jpeg;base64,${optimisedImageBuffer.toString('base64')}`;
        const cloudResponse = await cloudinary.uploader.upload(fileUri);
        const post = await Post.create({
            caption,
            image: cloudResponse.secure_url,
            author: authorId
        })
        const user = await User.findById(authorId);
        if (user) {
            user.posts.push(post._id);
            await user.save();
        }
        await post.populate({ path: 'author', select: '-password' });
        return res.status(200).json({
            message: "New post added",
            post,
            success: true
        })
    } catch (error) {
        console.log("Error in AddNewPost", error);
    }
}

export const getAllPost = async (req, res) => {
    try {
        const posts = await Post.find({}).sort({ createdAt: -1 })
            .populate({ path: "author", select: "username profilePicture" })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: {
                    path: "author",
                    select: "username profilePicture"
                }
            });
        return res.status(200).json({
            posts,
            success: true
        })
    } catch (error) {
        console.log("Error in getAllPost", error);
    }
}

export const getUserPost = async (req, res) => {
    try {
        const authorId = req.id;
        const posts = await Post.find({ author: authorId }).sort({ createdAt: -1 }).populate({ path: "author", select: "username,profilePicture" }).populate({
            path: "comments",
            sort: { createdAt: -1 },
            select: "username,profilePicture"
        })
        return res.status(200).json({
            posts,
            success: true
        })
    } catch (error) {
        console.log("Error in getUserPost", error);
    }
}

export const likedPost = async (req, res) => {
    try {
        const likekarnewala = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(400).json({
                message: "post not found",
                success: false
            })
        }
        await post.updateOne({ $addToSet: { likes: likekarnewala } });
        await post.save();
        //implement socket for real time notification
        const user = await User.findById(likekarnewala).select('username profilePicture');
        const postOwnerId = post.author.toString();
        if (postOwnerId !== likekarnewala) {
            //emit a notification 
            const notification = {
                type: 'like',
                userId: likekarnewala,
                userDetails: user,
                postId,
                message: 'Your post is liked'
            }
            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            io.to(postOwnerSocketId).emit('notification', notification);
        }
        return res.status(200).json({
            message: "Post liked ",
            success: true
        })
    } catch (error) {
        console.log("Error in likedpost", error);
    }
}
export const dislikePost = async (req, res) => {
    try {
        const likekarnewala = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(400).json({
                message: "post not found",
                success: false
            })
        }
        await post.updateOne({ $pull: { likes: likekarnewala } });
        await post.save();
        //implement socket for real time notification
        const user = await User.findById(likekarnewala).select('username profilePicture');
        const postOwnerId = post.author.toString();
        if (postOwnerId !== likekarnewala) {
            //emit a notification 
            const notification = {
                type: 'dislike',
                userId: likekarnewala,
                userDetails: user,
                postId,
                message: 'Your post is liked'
            }
            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            io.to(postOwnerSocketId).emit('notification', notification);
        }
        return res.status(200).json({
            message: "dislike post",
            post,
            success: true
        })
    } catch (error) {
        console.log("Error in dislike post", error);
    }
}

export const addComment = async (req, res) => {
    try {
        const commentkarenewala = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({
                message: "all fields are required",
                success: false
            })
        }
        const comment = await Comment.create({
            text,
            author: commentkarenewala,
            post: postId
        })
        // .populate({
        //     path:'author',
        //     select: "username,profilePicture"
        // })
        const populateComment = await Comment.findById(comment._id).populate({
            path: 'author',
            select: "username profilePicture"
        })
        post.comments.push(comment._id);
        await post.save();
        return res.status(200).json({
            message: "comment added",
            comment,
            success: true
        })
    } catch (error) {
        console.log("Error in add comment", error);
    }
}

export const getCommentofPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const comments = await Comment.find({ post: postId }).populate({
            path: 'author',
            select: "username profilePicture"
        });
        if (!comments) {
            return res.status(404).json({
                message: "No comment found for this post",
                success: false
            })
        }
        return res.status(200).json({ success: true, comments });
    } catch (error) {
        console.log("Error in get comment", error);
    }
}

export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found",
                success: true
            })
        }
        if (post.author.toString() != authorId) {
            return res.status(403).json({
                message: "Unauthorized",
                success: false
            })
        }
        await Post.findByIdAndDelete(postId);
        let user = await User.findById(authorId);
        user.posts = user.posts.filter(id => id.toString() != postId);
        await user.save();
        //delete the commment of that post
        await Comment.deleteMany({ post: postId });
        return res.status(200).json({
            success: true,
            message: "Post deleted"
        })
    } catch (error) {
        console.log("Error in delete post", error);
    }
}

export const bookmarkPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found",
                success: false
            })
        }
        const user = await User.findById(authorId);
        if (user.bookmarks.includes(post._id)) {
            //already bookmarked remove from bookmark
            await user.updateOne({ $pull: { bookmarks: postId } });
            await user.save();
            return res.status(200).json({
                type: "unsaved",
                message: "Post removed from bookMark",
                success: true
            })
        } else {
            await user.updateOne({ $addToSet: { bookmarks: post._id } });
            await user.save();
            return res.status(200).json({
                type: "saved",
                message: "post bookmarked",
                success: true
            })
        }
    } catch (error) {
        console.log("Error in bookmarkPost", error);
    }
}
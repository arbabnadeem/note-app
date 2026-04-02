require("dotenv").config();

const config = require("./config.json");
const mongoose = require("mongoose");
const userModel = require("./models/userModel");
const noteModel = require("./models/noteModel");

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => console.log("db connected"));
    await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    console.log(error.message);
  }
};

connectDB();

const express = require("express");
const cors = require("cors");
const app = express();

const jwt = require("jsonwebtoken");
const { authenticateToken } = require("./utilities");

app.use(express.json());

app.use(
  cors({
    origin: "*",
  }),
);

app.get("/", (req, res) => {
  res.send("app working");
});

// create account
app.post("/create-account", async (req, res) => {
  const { fullname, email, password } = req.body;

  // validation
  if (!fullname) {
    return res
      .status(400)
      .json({ error: true, message: "fullname is required" });
  }

  if (!email) {
    return res.status(400).json({ error: true, message: "email is required" });
  }

  if (!password) {
    return res
      .status(400)
      .json({ error: true, message: "password is required" });
  }

  const isUser = await userModel.findOne({ email });

  if (isUser) {
    return res.status(400).json({ error: true, message: "user already exist" });
  }

  const user = await userModel.create({
    fullname,
    email,
    password,
  });

  // const user1 = new userModel({
  //   fullname,
  //   email,
  //   password,
  // })

  // await user1.save()

  const accessToken = jwt.sign({ user }, process.env.SECRET_KEY, {
    expiresIn: "36000m",
  });

  return res.status(200).json({
    error: false,
    user,
    accessToken,
    messgae: "registration successful",
  });
});

// login api
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // validation
  if (!email) {
    return res.status(400).json({ error: true, message: "email is required" });
  }

  if (!password) {
    return res
      .status(400)
      .json({ error: true, message: "password is required" });
  }

  const userInfo = await userModel.findOne({ email });

  if (!userInfo) {
    return res.status(400).json({ error: true, message: "user not found" });
  }

  if (userInfo.email == email && userInfo.password == password) {
    const user = { user: userInfo };
    const accessToken = jwt.sign({ user }, process.env.SECRET_KEY, {
      expiresIn: "36000m",
    });

    return res.status(200).json({
      error: false,
      user,
      accessToken,
      messgae: "login successful",
    });
  } else {
    return res.status(400).json({
      error: true,
      message: "invalid credentials",
    });
  }
});

// get user api
app.get("/get-user", authenticateToken, async (req, res) => {
  const { user } = req.user.user;

  const isUser = await userModel.findOne({ _id: user._id });

  if (!isUser) {
    return res.status(401);
  }

  return res.status(200).json({
    user: {
      fullname: isUser.fullname,
      email: isUser.email,
      _id: isUser._id,
      createdOn: isUser.createdOn,
    },
    message: "",
  });
});

// add notes api
app.post("/add-note", authenticateToken, async (req, res) => {
  const { title, content, tags } = req.body;
  const { user } = req.user.user;

  if (!title) {
    return res.status(400).json({ error: true, message: "title is required" });
  }

  if (!content) {
    return res
      .status(400)
      .json({ error: true, message: "content is required" });
  }

  try {
    const note = await noteModel.create({
      title,
      content,
      tags: tags || [],
      userId: user._id.toString(),
    });

    return res.status(200).json({
      error: false,
      note,
      message: "note added successful",
    });
  } catch (error) {
    return res.status(400).json({
      error: true,
      message: "internet server error",
    });
  }
});

// edit note api
app.put("/edit-note/:noteId", authenticateToken, async (req, res) => {
  const noteId = req.params.noteId;
  const { title, content, tags, isPinned } = req.body;
  const { user } = req.user.user;

  if (!title && !content && !tags) {
    return res.status(400).json({ error: true, message: "no change provided" });
  }

  try {
    const note = await noteModel.findOne({
      _id: noteId,
      userId: user._id,
    });

    if (!note) {
      return res.status(404).json({
        error: true,
        message: "note not found",
      });
    }

    if (title) note.title = title;
    if (content) note.content = content;
    if (tags) note.tags = tags;
    if (isPinned) note.isPinned = isPinned;

    await note.save();

    return res
      .status(200)
      .json({ error: false, note, message: "note updated successfully" });
  } catch (error) {
    return res.status(400).json({
      error: true,
      message: "internal server error",
    });
  }
});

// get all notes api
app.get("/get-all-notes", authenticateToken, async (req, res) => {
  const { user } = req.user.user;

  try {
    const notes = await noteModel
      .find({ userId: user._id })
      .sort({ isPinned: -1 });

    return res.status(200).json({
      error: false,
      notes,
      message: "all notes recived successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "internal server error",
    });
  }
});

// delete note api
app.delete("/delete-note/:noteId", authenticateToken, async (req, res) => {
  let noteId = req.params.noteId;
  let { user } = req.user.user;

  try {
    const note = await noteModel.findOne({ _id: noteId, userId: user._id });

    if (!note) {
      return res.status(400).json({ error: true, message: "note not found" });
    }

    await noteModel.deleteOne({ _id: noteId, userId: user._id });

    return res.status(200).json({
      error: false,
      message: "note deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({
      error: true,
      message: "internal server error",
    });
  }
});

// update isPinned api
app.put("/update-note-pinned/:noteId", authenticateToken, async (req, res) => {
  const noteId = req.params.noteId;
  const { isPinned } = req.body;
  const { user } = req.user.user;

  try {
    const note = await noteModel.findOne({
      _id: noteId,
      userId: user._id,
    });

    if (!note) {
      return res.status(404).json({
        error: true,
        message: "note not found",
      });
    }

    note.isPinned = isPinned;

    await note.save();

    return res.status(200).json({
      error: false,
      note,
      message: "note updated successfully",
    });
  } catch (error) {
    return res.status(400).json({
      error: true,
      message: "internal server error",
    });
  }
});

// search notes
app.get("/search-notes", authenticateToken, async (req, res) => {
  const { user } = req.user.user;
  const { query } = req.query;

  if (!query) {
    return res
      .status(400)
      .json({ error: true, message: "search query is required" });
  }

  try {
    let matchingNotes = await noteModel.find({
      userId: user._id,
      $or: [
        { title: { $regex: new RegExp(query, "i") } },
        { content: { $regex: new RegExp(query, "i") } },
      ],
    });

    return res.status(200).json({
      error: false,
      notes: matchingNotes,
      message: "note mactching the search query is resived successfuly",
    });
  } catch (error) {
    return res
      .status(400)
      .json({ error: true, message: "internal server error" });
  }
});

app.listen(process.env.PORT || 8000);

module.exports = app;

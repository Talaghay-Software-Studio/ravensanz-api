// adminController.js
const AdminModel = require("../models/adminModel");
const formidable = require("formidable");
const bcrypt = require("bcrypt");
const adminController = {};
const querystring = require("querystring"); // Add this if not already imported
const { v4: uuidv4 } = require("uuid");
const { bucket } = require("./../../server");
const fs = require("fs");
const fetch = require("isomorphic-fetch");

// adminController.js

adminController.login = (req, res) => {
  const { email_add, password } = req.body;

  AdminModel.getByEmail(email_add, async (error, user) => {
    if (error) {
      console.error("Error checking email: ", error);
      return res.status(500).send({ message: "Error checking email" });
    }

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Compare password
    bcrypt.compare(password, user.password, async (err, isMatch) => {
      if (err) {
        console.error("Error comparing passwords: ", err);
        return res.status(500).send({ message: "Error comparing passwords" });
      }

      if (!isMatch) {
        return res.status(401).send({ message: "Check email/password" });
      }

      // Password is correct, retrieve user details
      AdminModel.getUserDetailsByUserId(user.id, (error, userDetails) => {
        if (error) {
          console.error("Error retrieving user details: ", error);
          return res
            .status(500)
            .send({ message: "Error retrieving user details" });
        }

        // Set default values for fields if they are null
        const defaultValues = {
          full_name: "No name",
          display_name: "No name",
          phone_number: "##########",
          isAdmin: "0",
          isWriterVerified: "0",
          isEmailVerified: "0",
          writerApplicationStatus: "0",
          imageId: "0",
          wingsCount: 0,
          isSubscriber: "0",
          subscriptionExpirationDate: "1970-01-01",
          isReadingModeOver18: "0",
          writerBadge: "0",
          readerBadge: "0",
        };

        // Check if userDetails is not null and has at least one element
        const userDetailsArray = userDetails || [];
        const userDetailsItem = userDetailsArray[0] || {};

        // Combine user details with user object
        const userWithDetails = { ...user, ...userDetailsItem };

        // Apply default values to the user object
        const userWithDefaults = {
          id: userWithDetails.id,
          status: userWithDetails.status,
          type: userWithDetails.type,
          email_add: userWithDetails.email_add,
          full_name: userWithDetails.full_name || defaultValues.full_name,
          display_name:
            userWithDetails.display_name || defaultValues.display_name,
          phone_number:
            userWithDetails.phone_number || defaultValues.phone_number,
          modified_at: userWithDetails.modified_at,
          created_at: userWithDetails.created_at,
          isAdmin: userWithDetails.isAdmin || defaultValues.isAdmin,
          isWriterVerified:
            userWithDetails.isWriterVerified || defaultValues.isWriterVerified,
          isEmailVerified:
            userWithDetails.isEmailVerified || defaultValues.isEmailVerified,
          writerApplicationStatus:
            userWithDetails.writerApplicationStatus ||
            defaultValues.writerApplicationStatus,
          imageId: userWithDetails.imageId || defaultValues.imageId,
          wingsCount: userWithDetails.wingsCount || defaultValues.wingsCount,
          isSubscriber:
            userWithDetails.isSubscriber || defaultValues.isSubscriber,
          subscriptionExpirationDate:
            userWithDetails.subscriptionExpirationDate ||
            defaultValues.subscriptionExpirationDate,
          isReadingModeOver18:
            userWithDetails.isReadingModeOver18 ||
            defaultValues.isReadingModeOver18,
          writerBadge: userWithDetails.writerBadge || defaultValues.writerBadge,
          readerBadge: userWithDetails.readerBadge || defaultValues.readerBadge,
        };

        // If userDetails is null or empty, set all properties to default values
        if (!userDetails || userDetails.length === 0) {
          userWithDefaults.id = defaultValues.id;
          userWithDefaults.full_name = defaultValues.full_name;
          userWithDefaults.display_name = defaultValues.display_name;
          userWithDefaults.phone_number = defaultValues.phone_number;
          userWithDefaults.modified_at = defaultValues.modified_at;
          userWithDefaults.created_at = defaultValues.created_at;
          userWithDefaults.isAdmin = defaultValues.isAdmin;
          userWithDefaults.isWriterVerified = defaultValues.isWriterVerified;
          userWithDefaults.isEmailVerified = defaultValues.isEmailVerified;
          userWithDefaults.writerApplicationStatus =
            defaultValues.writerApplicationStatus;
          userWithDefaults.imageId = defaultValues.imageId;
          userWithDefaults.wingsCount = defaultValues.wingsCount;
          userWithDefaults.isSubscriber = defaultValues.isSubscriber;
          userWithDefaults.subscriptionExpirationDate =
            defaultValues.subscriptionExpirationDate;
          userWithDefaults.isReadingModeOver18 =
            defaultValues.isReadingModeOver18;
          userWithDefaults.writerBadge = defaultValues.writerBadge;
          userWithDefaults.readerBadge = defaultValues.readerBadge;
          // ... (similar lines for other properties)
        }

        // Remove unwanted part
        const { password, token, ...userData } = userWithDefaults;

        // Return user details and token in the response
        res.status(200).json({
          message: "User details retrieved successfully",
          data: userData,
        });
      });
    });
  });
};

adminController.getStories = (req, res) => {
  const { authorId, searchQuery, isPublished } = req.query;

  AdminModel.getStories(
    { authorId, searchQuery, isPublished },
    (error, results) => {
      if (error) {
        return res.status(500).json({ message: "Internal server error" });
      }
      res.json(results);
    }
  );
};

adminController.getGenres = (req, res) => {
  const { searchQuery } = req.query;

  AdminModel.getGenre({ searchQuery }, (error, results) => {
    if (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
    res.json(results);
  });
};

adminController.getAuthors = (req, res) => {
  const { authorId, fullName, emailAdress, displayName } = req.query;

  AdminModel.getAuthor(
    { authorId, fullName, emailAdress, displayName },
    (error, results) => {
      if (error) {
        return res.status(500).json({ message: "Internal server error" });
      }
      res.json(results);
    }
  );
};

adminController.createStory = (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields) => {
    if (err) {
      return res.status(400).json({ message: "Error parsing form data" });
    }

    // Decode each field using querystring.unescape
    const decodedFields = {};
    Object.keys(fields).forEach((key) => {
      decodedFields[key] = querystring.unescape(fields[key]);
    });

    const { userId, title, blurb, language, genre, status } = decodedFields;

    if (!userId || !title || !blurb || !language || !genre || !status) {
      return res
        .status(400)
        .json({ message: "Missing required fields in request body" });
    }

    AdminModel.createStory(
      userId,
      title,
      blurb,
      language,
      genre,
      status,
      (error, result) => {
        if (error) {
          return res.status(500).json({ message: "Internal server error" });
        } else {
          return res.status(201).json({
            message: "Story created successfully",
            episodeId: result.episodeId,
          });
        }
      }
    );
  });
};

// In adminController.js
adminController.deleteStory = (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: "Story ID is required" });
  }

  AdminModel.deleteStory(id, (error, result) => {
    if (error) {
      return res.status(500).json({ message: "Internal server error" });
    } else {
      // Check if the deletion was blocked due to linked records
      if (result && result.message) {
        return res.status(409).json({ message: result.message }); // 409 Conflict might be appropriate here
      }
      return res.status(200).json({ message: "Story deleted successfully" });
    }
  });
};

adminController.updateStory = (req, res) => {
  const storyId = req.params.id;
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields) => {
    if (err) {
      return res.status(400).json({ message: "Error parsing form data" });
    }

    const decodedFields = {};
    Object.keys(fields).forEach((key) => {
      decodedFields[key] = querystring.unescape(fields[key]).trim();
    });

    if (
      !decodedFields.userId ||
      !decodedFields.title ||
      !decodedFields.blurb ||
      !decodedFields.language ||
      !decodedFields.genre ||
      !decodedFields.status
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    AdminModel.updateStory(storyId, decodedFields, (error, result) => {
      if (error) {
        return res.status(500).json({ message: "Internal server error" });
      } else {
        return res.status(200).json({ message: "Story updated successfully" });
      }
    });
  });
};

adminController.uploadBookCover = async (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Error during form parsing", err);
      return res.status(400).send({ message: "Error parsing the upload" });
    }

    // Access uploaded file
    const file = files.file[0];
    if (!file) {
      return res.status(400).send({ message: "No file uploaded" });
    }

    console.log("File path:", file.filepath); // Ensure this is the correct property

    // Extract filename and extension
    const originalFilename = file.originalFilename.split(".");
    const filename = originalFilename[0];
    const fileType = file.type ? file.type.split("/")[1] : "jpg";

    // Construct unique filename without extension
    const uniqueFilename = uuidv4();
    const firebaseFilename = `${uniqueFilename}-${filename}.${fileType}`;

    const blob = bucket.file("book-covers/" + firebaseFilename);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    // Stream the file
    fs.createReadStream(file.filepath).pipe(blobStream);

    blobStream.on("error", (error) => {
      console.error("Blob stream encountered an error: ", error);
      res.status(500).send({ message: "Upload failed" });
    });

    blobStream.on("finish", async () => {
      // Get original URL without resizing
      const originalUrl = `https://firebasestorage.googleapis.com/v0/b/${
        bucket.name
      }/o/${encodeURIComponent(blob.name)}?alt=media`;

      const splittedFirstHalf = originalUrl.split("?")[0];
      const replacedFileUrl = splittedFirstHalf.replace(
        `.${fileType}`,
        `_300x400.${fileType}`
      );
      const finalUrl = `${replacedFileUrl}?alt=media`;

      try {
        const insertedId = await AdminModel.saveFileUrl(finalUrl);
        res
          .status(200)
          .send({
            message: "File uploaded successfully",
            url: finalUrl,
            id: insertedId,
          });
      } catch (error) {
        console.error("Error fetching file URL: ", error);
        const errorMessage = `Error fetching file from URL: ${finalUrl}`;
        res.status(500).send({ message: errorMessage });
      }
    });
  });
};

module.exports = adminController;

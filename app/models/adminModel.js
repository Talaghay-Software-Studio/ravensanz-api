// File: app/models/adminModel.js
const dbConn = require("../config/db.config");
const { v4: uuidv4 } = require("uuid");

const AdminModel = {};

AdminModel.getByEmail = (email, callback) => {
  dbConn.query(
    "SELECT * FROM ravensanz_users WHERE email_add = ?",
    [email],
    (error, result) => {
      if (error) {
        console.error("Error retrieving user by email: ", error);
        return callback(error, null);
      }

      if (result.length > 0) {
        return callback(null, result[0]);
      } else {
        return callback(null, null);
      }
    }
  );
};

AdminModel.getUserDetailsByUserId = (userId, callback) => {
  dbConn.query(
    "SELECT * FROM ravensanz_users WHERE id = ?",
    [userId],
    (error, result) => {
      if (error) {
        console.error("Error retrieving user details: ", error);
        return callback(error, null); // Fix: Added the callback with the error
      }

      if (result.length > 0) {
        return callback(null, result); // Fix: Return the query result
      } else {
        return callback(null, null);
      }
    }
  );
};

// adminModel.js
AdminModel.getStories = ({ authorId, searchQuery, isPublished }, callback) => {
  let sql = `SELECT * FROM v_admin_story_images`;
  let conditions = [];
  let params = [];

  if (authorId) {
    conditions.push(`author_id = ?`);
    params.push(authorId);
  }
  if (searchQuery) {
    conditions.push(`title LIKE ?`);
    params.push(`%${searchQuery}%`);
  }
  if (isPublished !== undefined) {
    conditions.push(`isPublished = ?`);
    params.push(isPublished);
  }

  if (conditions.length) {
    sql += ` WHERE ` + conditions.join(" AND ");
  }

  dbConn.query(sql, params, (error, stories) => {
    if (error) {
      console.error("Error fetching stories: ", error);
      return callback(error, null);
    }
    callback(null, stories);
  });
};


AdminModel.getGenre = ({ searchQuery }, callback) => {
  let sql = `SELECT * FROM story_genre`;
  let conditions = [];
  let params = [];

  if (searchQuery) {
    conditions.push(`name LIKE ?`);
    params.push(`%${searchQuery}%`);
  }

  if (conditions.length) {
    sql += ` WHERE ` + conditions.join(" AND ");
  }

  dbConn.query(sql, params, (error, results) => {
    if (error) {
      console.error("Error fetching genre: ", error);
      return callback(error, null);
    }
    return callback(null, results);
  });
};

AdminModel.getAuthor = (
  { authorId, fullName, emailAdress, displayName },
  callback
) => {
  let sql = `SELECT * FROM ravensanz_users`;
  let conditions = [];
  let params = [];

  if (authorId) {
    conditions.push(`id = ?`);
    params.push(authorId);
  }

  if (fullName) {
    conditions.push(`full_name LIKE ?`);
    params.push(`%${fullName}%`);
  }

  if (emailAdress) {
    conditions.push(`email_add LIKE ?`);
    params.push(`%${emailAdress}%`);
  }

  if (displayName) {
    conditions.push(`display_name LIKE ?`);
    params.push(`%${displayName}%`);
  }

  conditions.push(`isWriterVerified = ?`);
  params.push(1);

  if (conditions.length) {
    sql += ` WHERE ` + conditions.join(" AND ");
  }

  dbConn.query(sql, params, (error, results) => {
    if (error) {
      console.error("Error fetching genre: ", error);
      return callback(error, null);
    }
    return callback(null, results);
  });
};

AdminModel.createStory = (
  userId,
  title,
  blurb,
  language,
  genre,
  status,
  imageId,
  callback
) => {
  const ravensanzQuery = "SELECT * FROM ravensanz_users WHERE id = ?";
  dbConn.query(ravensanzQuery, [userId], (error, ravensanzResults) => {
    if (error) {
      console.error("Error checking userId existence in ravensanz_users table: ", error);
      return callback(error, null);
    }

    console.log("ravensanzQuery result: ", ravensanzResults);

    const userQuery = "SELECT * FROM user WHERE id = ?";
    dbConn.query(userQuery, [userId], (error, userResults) => {
      if (error) {
        console.error("Error checking userId existence in user table: ", error);
        return callback(error, null);
      }

      console.log("userQuery result: ", userResults);

      const id = uuidv4(); // Generate the UUID
      const sql = `INSERT INTO story_lists (id, userId, title, blurb, language, genre, status, imageId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
      dbConn.query(
        sql,
        [id, userId, title, blurb, language, genre, status, imageId],
        (error, result) => {
          if (error) {
            console.error("Error creating story: ", error);
            return callback(error, null);
          }
          console.log("Insert result: ", result);
          return callback(null, { id }); // Return the generated UUID
        }
      );
    });
  });
};


AdminModel.updateStory = (id, storyDetails, callback) => {
  const { userId, title, blurb, language, genre, status, imageId } = storyDetails;
  const sql = `UPDATE story_lists SET userId = ?, title = ?, blurb = ?, language = ?, genre = ?, status = ?, imageId = ? WHERE id = ?`;

  dbConn.query(
    sql,
    [userId, title, blurb, language, genre, status, imageId, id],
    (error, result) => {
      if (error) {
        console.error("Error updating story: ", error);
        return callback(error, null);
      }
      return callback(null, result);
    }
  );
};

// In adminModel.js
AdminModel.deleteStory = (id, callback) => {
  // SQL query to check for any links in story_tags, story_episodes_views, and story_comments
  const checkLinksSql = `
        SELECT EXISTS (
            SELECT 1 FROM story_tags WHERE storyId = ?
            UNION ALL
            SELECT 1 FROM story_episodes_views WHERE story_id = ?
            UNION ALL
            SELECT 1 FROM story_episodes WHERE storyId = ?
        ) AS linkedExists;
    `;

  // Execute the query to check for linked records
  dbConn.query(checkLinksSql, [id, id, id], (error, results) => {
    if (error) {
      console.error("Error checking for linked data: ", error);
      return callback(error, null);
    }

    // Check if any linked records exist
    if (results[0].linkedExists) {
      return callback(null, {
        message:
          "Cannot delete story as there are linked records in other tables.",
      });
    } else {
      // If no linked records, proceed with deletion
      const deleteSql = `DELETE FROM story_lists WHERE id = ?`;
      dbConn.query(deleteSql, [id], (error, result) => {
        if (error) {
          console.error("Error deleting story: ", error);
          return callback(error, null);
        }
        return callback(null, result);
      });
    }
  });
};

AdminModel.saveFileUrl = (url, callback) => {
  const sql = "INSERT INTO story_images (url, createdAt, updatedAt) VALUES (?, NOW(), NOW())";

  dbConn.query(sql, [url], (error, result) => {
    if (error) {
      console.error("Error saving story image: ", error);
      return callback(error, null);
    }
    // Extract the inserted ID from the result object
    const insertedId = result.insertId;
    callback(null, insertedId);
  });
};

AdminModel.getStoryTagsByStoryId = (storyId, callback) => {
  const sql = "SELECT name FROM story_tags WHERE storyId = ?";
  dbConn.query(sql, [storyId], (error, results) => {
    if (error) {
      console.error("Error fetching story tags: ", error);
      return callback(error, null);
    }
    const tags = results.map(row => row.name);
    callback(null, tags);
  });
};


AdminModel.addStoryTags = (storyId, tags, callback) => {
  const sql = "INSERT INTO story_tags (storyId, name, createdAt, updatedAt) VALUES ?";
  const values = tags.map(tag => [storyId, tag.trim(), new Date(), new Date()]);
  dbConn.query(sql, [values], (error, result) => {
    if (error) {
      console.error("Error adding story tags: ", error);
      return callback(error, null);
    }
    callback(null, result);
  });
};

AdminModel.deleteStoryTags = (storyId, callback) => {
  const sql = "DELETE FROM story_tags WHERE storyId = ?";
  dbConn.query(sql, [storyId], (error, result) => {
    if (error) {
      console.error("Error deleting story tags: ", error);
      return callback(error, null);
    }
    callback(null, result);
  });
};


module.exports = AdminModel;

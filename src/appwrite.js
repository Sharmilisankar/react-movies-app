
import { Client, TablesDB, ID, Query } from "appwrite";

const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TABLE_ID = import.meta.env.VITE_APPWRITE_TABLE_ID;

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject(PROJECT_ID);

const tablesDB = new TablesDB(client);

const validateConfig = () => {
  const missing = [];

  if (!PROJECT_ID) missing.push("VITE_APPWRITE_PROJECT_ID");
  if (!DATABASE_ID) missing.push("VITE_APPWRITE_DATABASE_ID");
  if (!TABLE_ID) missing.push("VITE_APPWRITE_TABLE_ID");

  if (missing.length > 0) {
    throw new Error(
      `Missing Appwrite configuration: ${missing.join(", ")}`
    );
  }
};

const getPosterUrl = (movie) => {
  if (movie?.poster_url) {
    return movie.poster_url;
  }

  if (movie?.poster_path) {
    if (movie.poster_path.startsWith("http")) {
      return movie.poster_path;
    }

    return `https://image.tmdb.org/t/p/w342/${movie.poster_path.replace(
      /^\/+/,
      ""
    )}`;
  }

  return "";
};

// Save or increment the count for a search term.
export const updateSearchCount = async (searchTerm, movie) => {
  try {
    validateConfig();

    const term = searchTerm?.trim();

    if (!term || !movie?.id) {
      console.warn("Search count skipped: missing search term or movie ID.");
      return false;
    }

    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries: [
        Query.equal("searchTerm", term),
        Query.limit(1),
      ],
    });

    // Only send attributes that exist in your Appwrite table.
    const movieData = {
      searchTerm: term,
      movie_id: Number(movie.id),
      poster_url: getPosterUrl(movie),
    };

    if (result.rows.length > 0) {
      const row = result.rows[0];

      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: row.$id,
        data: {
          ...movieData,
          count: Number(row.count || 0) + 1,
        },
      });
    } else {
      await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: ID.unique(),
        data: {
          ...movieData,
          count: 1,
        },
      });
    }

    return true;
  } catch (error) {
    console.error("Appwrite search-count error:", error);
    return false;
  }
};

// Retrieve the five most-searched terms.
export const getTrendingMovies = async () => {
  try {
    validateConfig();

    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries: [
        Query.orderDesc("count"),
        Query.limit(5),
      ],
    });

    return (result.rows || []).map((row) => ({
      ...row,
      // Display a title without requiring a separate title column.
      title: row.searchTerm || "Unknown movie",
      poster_url: getPosterUrl(row),
      count: Number(row.count || 0),
    }));
  } catch (error) {
    console.error("Appwrite trending movies error:", error);

    // null means the request failed, so existing cached results are preserved.
    return null;
  }
};

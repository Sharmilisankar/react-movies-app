
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

  if (missing.length) {
    throw new Error(
      `Missing Appwrite configuration: ${missing.join(", ")}. Check your .env file.`
    );
  }
};

const getPosterUrl = (movie) => {
  if (movie?.poster_url) return movie.poster_url;

  if (movie?.poster_path) {
    return `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
  }

  return "";
};

// Record each movie search in Appwrite.
export const updateSearchCount = async (searchTerm, movie) => {
  try {
    validateConfig();

    const term = searchTerm?.trim();

    if (!term || !movie?.id) {
      console.warn("Skipping search count: search term or movie ID is missing.");
      return;
    }

    const title = movie.title || movie.name || term;
    const posterUrl = getPosterUrl(movie);

    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries: [
        Query.equal("searchTerm", term),
        Query.limit(1),
      ],
    });

    const movieData = {
      searchTerm: term,
      title,
      movie_id: Number(movie.id),
      poster_url: posterUrl,
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
  } catch (error) {
    console.error("Appwrite search-count error:", error);
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

    const rows = result.rows || [];

    console.log("Trending movies loaded from Appwrite:", rows);

    return rows.map((row) => ({
      ...row,
      title: row.title || row.searchTerm || "Unknown movie",
      poster_url: getPosterUrl(row),
      count: Number(row.count || 0),
    }));
  } catch (error) {
    console.error("Appwrite trending movies error:", error);
    return [];
  }
};

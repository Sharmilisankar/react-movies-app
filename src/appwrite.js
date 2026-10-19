
import { Client, TablesDB, ID, Query } from 'appwrite'

const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID
const TABLE_ID = import.meta.env.VITE_APPWRITE_TABLE_ID

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject(PROJECT_ID)

const tablesDB = new TablesDB(client)

const validateConfig = () => {
  if (!PROJECT_ID || !DATABASE_ID || !TABLE_ID) {
    throw new Error(
      'Missing Appwrite configuration. Check your project, database, and table IDs in .env'
    )
  }
}

export const updateSearchCount = async (searchTerm, movie) => {
  try {
    validateConfig()

    if (!searchTerm?.trim() || !movie?.id) {
      console.warn('Cannot save trending search: search term or movie ID is missing.')
      return
    }

    const title = movie.title || movie.name || searchTerm
    const posterUrl = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : ''

    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries: [
        Query.equal('searchTerm', searchTerm),
        Query.limit(1),
      ],
    })

    const movieData = {
      searchTerm,
      title,
      movie_id: movie.id,
      poster_url: posterUrl,
    }

    if (result.rows.length > 0) {
      const row = result.rows[0]

      // Update older rows too, not just their search count.
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: row.$id,
        data: {
          ...movieData,
          count: Number(row.count || 0) + 1,
        },
      })
    } else {
      await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: ID.unique(),
        data: {
          ...movieData,
          count: 1,
        },
      })
    }
  } catch (error) {
    console.error('Appwrite search-count error:', error)
  }
}

export const getTrendingMovies = async () => {
  try {
    validateConfig()

    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries: [
        Query.orderDesc('count'),
        Query.limit(5),
      ],
    })

    return result.rows || []
  } catch (error) {
    console.error('Appwrite trending movies error:', error)
    return []
  }
}

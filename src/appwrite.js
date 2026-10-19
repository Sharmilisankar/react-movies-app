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

    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries: [
        Query.equal('searchTerm', searchTerm),
        Query.limit(1),
      ],
    })

    if (result.rows.length > 0) {
      const row = result.rows[0]

      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: row.$id,
        data: {
          count: row.count + 1,
        },
      })
    } else {
      await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: ID.unique(),
        data: {
          searchTerm: searchTerm,
            title: movie.title,
          count: 1,
          movie_id: movie.id,
          poster_url: movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : '',
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

    return result.rows
  } catch (error) {
    console.error('Appwrite trending movies error:', error)
    return []
  }
}
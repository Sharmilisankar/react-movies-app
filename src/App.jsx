
import { useEffect, useState } from 'react'
import Search from './components/Search.jsx'
import Spinner from './components/Spinner.jsx'
import MovieCard from './components/MovieCard.jsx'
import { useDebounce } from 'react-use'
import { getTrendingMovies, updateSearchCount } from './appwrite.js'

const API_BASE_URL = 'https://api.themoviedb.org/3'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY

const API_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  },
}

const App = () => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [movieList, setMovieList] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [trendingMovies, setTrendingMovies] = useState([])

  useDebounce(() => {
    setDebouncedSearchTerm(searchTerm.trim())
  }, 500, [searchTerm])

  const fetchMovies = async (query = '') => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`

      const response = await fetch(endpoint, API_OPTIONS)

      if (!response.ok) {
        throw new Error(
          `TMDB request failed with status ${response.status}`
        )
      }

      const data = await response.json()
      const results = data.results || []

      setMovieList(results)

      if (query && results.length > 0) {
        try {
          await updateSearchCount(query, results[0])
        } catch (error) {
          console.error('Error updating search count:', error)
        }
      }
    } catch (error) {
      console.error('Error fetching movies:', error)
      setErrorMessage(
        'We could not connect to the movie service. Please check your internet connection and try again.'
      )
      setMovieList([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies()
      setTrendingMovies(movies || [])
    } catch (error) {
      console.error('Error fetching trending movies:', error)
    }
  }

  useEffect(() => {
    fetchMovies(debouncedSearchTerm)
  }, [debouncedSearchTerm])

  useEffect(() => {
    loadTrendingMovies()
  }, [])

  const handleRetry = () => {
    fetchMovies(debouncedSearchTerm)
  }

  return (
    <main className="app">
      <div className="pattern" aria-hidden="true" />

      <div className="wrapper">
        <header className="hero">
          <div className="brand">
            <span className="brand-mark">C</span>
            <span className="brand-name">CineScope</span>
            <span className="brand-caption">YOUR MOVIE DISCOVERY SPACE</span>
          </div>

          <div className="hero-content">
            <p className="eyebrow">FIND YOUR NEXT FAVORITE</p>

            <h1>
              Every movie has a
              <br />
              <span className="text-gradient">story worth finding.</span>
            </h1>

            <p className="hero-description">
              Explore popular films, search for timeless favorites,
              and discover something new for your next movie night.
            </p>

            <Search
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />

            <div className="hero-note">
              <span className="status-dot" />
              A little inspiration for your next watch
            </div>
          </div>
        </header>

        {trendingMovies.length > 0 && (
          <section className="trending">
            <div className="section-heading">
              <div>
                <p className="section-kicker">WHAT PEOPLE ARE SEARCHING</p>
                <h2>Trending Searches</h2>
              </div>
              <span className="section-tag">POPULAR</span>
            </div>

            <ul>
              {trendingMovies.map((movie, index) => (
                <li key={movie.$id || `${movie.title}-${index}`}>
                  <span className="trend-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <img
                    src={movie.poster_url}
                    alt={movie.title || 'Trending movie poster'}
                    loading="lazy"
                  />

                  <div className="trend-info">
                    <span>TRENDING</span>
                    <p title={movie.title}>{movie.title}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="all-movies">
          <div className="section-heading">
            <div>
              <p className="section-kicker">
                {debouncedSearchTerm
                  ? 'YOUR SEARCH RESULTS'
                  : 'HANDPICKED FOR DISCOVERY'}
              </p>

              <h2>
                {debouncedSearchTerm
                  ? `Results for "${debouncedSearchTerm}"`
                  : 'Explore Movies'}
              </h2>
            </div>

            {!isLoading && !errorMessage && movieList.length > 0 && (
              <span className="result-count">
                {movieList.length} titles
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="state-panel">
              <Spinner />
              <p>Finding movies for you...</p>
            </div>
          ) : errorMessage ? (
            <div className="state-panel error-panel">
              <span className="state-icon">!</span>
              <h3>Movies are taking a break</h3>
              <p>{errorMessage}</p>
              <button
                className="retry-button"
                type="button"
                onClick={handleRetry}
              >
                Try again
              </button>
            </div>
          ) : movieList.length > 0 ? (
            <ul>
              {movieList.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </ul>
          ) : (
            <div className="state-panel">
              <h3>No movies found</h3>
              <p>Try a different title to discover more movies.</p>
            </div>
          )}
        </section>

        <footer className="app-footer">
          <span className="footer-brand">CineScope</span>
          <p>Made for people who love a good story.</p>
          <p className="footer-credit">
            Movie data provided by TMDB.
          </p>
        </footer>
      </div>
    </main>
  )
}

export default App


import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useDebounce } from 'react-use'

import Search from './components/Search.jsx'
import Spinner from './components/Spinner.jsx'
import MovieCard from './components/MovieCard.jsx'
import {
  getTrendingMovies,
  updateSearchCount,
} from './appwrite.js'

const API_BASE_URL = 'https://api.themoviedb.org/3'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY

const API_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  },
}

const TrendingPoster = ({ movie, fallback = '🎬' }) => {
  const [imageFailed, setImageFailed] = useState(false)

  const poster =
    movie.poster_url ||
    movie.posterUrl ||
    movie.poster_path ||
    ''

  const posterUrl =
    typeof poster === 'string' && poster.trim()
      ? poster.startsWith('http')
        ? poster
        : `https://image.tmdb.org/t/p/w342/${poster.replace(/^\/+/, '')}`
      : ''

  if (!posterUrl || imageFailed) {
    return (
      <div className="trend-poster-fallback" aria-hidden="true">
        {fallback}
      </div>
    )
  }

  return (
    <img
      className="trend-poster"
      src={posterUrl}
      alt={movie.title || movie.searchTerm || 'Trending movie poster'}
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  )
}

TrendingPoster.propTypes = {
  movie: PropTypes.shape({
    poster_url: PropTypes.string,
    posterUrl: PropTypes.string,
    poster_path: PropTypes.string,
    title: PropTypes.string,
    searchTerm: PropTypes.string,
  }).isRequired,
  fallback: PropTypes.string,
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

  const loadTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies()
      setTrendingMovies(Array.isArray(movies) ? movies : [])
    } catch (error) {
      console.error('Error fetching trending movies:', error)
      setTrendingMovies([])
    }
  }

  const fetchMovies = async (query = '') => {
    if (!API_KEY) {
      setErrorMessage(
        'The TMDB API key is missing. Please check VITE_TMDB_API_KEY in your .env file.'
      )
      setMovieList([])
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`

      const response = await fetch(endpoint, API_OPTIONS)

      if (!response.ok) {
        throw new Error(`TMDB request failed with status ${response.status}`)
      }

      const data = await response.json()
      const results = data.results || []

      setMovieList(results)

      if (query && results.length > 0) {
        await updateSearchCount(query, results[0])
        await loadTrendingMovies()
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

  useEffect(() => {
    fetchMovies(debouncedSearchTerm)
  }, [debouncedSearchTerm])

  useEffect(() => {
    loadTrendingMovies()
  }, [])

  const handleRetry = () => {
    fetchMovies(debouncedSearchTerm)
  }

  const showDecorativeCards = trendingMovies.length === 0

  const decorativeMovies = [
    {
      id: 'discover',
      title: 'Popular Movies',
      label: 'DISCOVER',
      icon: '🎬',
    },
    {
      id: 'favorites',
      title: 'Fan Favorites',
      label: 'EXPLORE',
      icon: '🍿',
    },
    {
      id: 'next-watch',
      title: 'Movies to Discover',
      label: 'YOUR NEXT WATCH',
      icon: '⭐',
    },
  ]

  return (
    <main className="app">
      <div className="pattern" aria-hidden="true" />

      <div className="wrapper">
        <header className="hero">
          <div className="brand">
            <span className="brand-mark">C</span>
            <span className="brand-name">CineScope</span>
            <span className="brand-caption">
              YOUR MOVIE DISCOVERY SPACE
            </span>
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

        <section className="trending">
          <div className="section-heading">
            <div>
              <p className="section-kicker">
                WHAT PEOPLE ARE SEARCHING
              </p>
              <h2>Trending Searches</h2>
            </div>

            <span className="section-tag">
              {showDecorativeCards ? 'DISCOVER' : 'POPULAR'}
            </span>
          </div>

          <ul>
            {showDecorativeCards
              ? decorativeMovies.map((movie, index) => (
                  <li key={movie.id}>
                    <span className="trend-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div
                      className="trend-poster-fallback"
                      aria-hidden="true"
                    >
                      {movie.icon}
                    </div>

                    <div className="trend-info">
                      <span>{movie.label}</span>
                      <p title={movie.title}>{movie.title}</p>
                    </div>
                  </li>
                ))
              : trendingMovies.map((movie, index) => {
                  const title =
                    movie.title ||
                    movie.name ||
                    movie.movie_title ||
                    movie.searchTerm ||
                    'Movie title unavailable'

                  return (
                    <li key={movie.$id || `${title}-${index}`}>
                      <span className="trend-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <TrendingPoster movie={movie} />

                      <div className="trend-info">
                        <span>TRENDING</span>
                        <p title={title}>{title}</p>
                      </div>
                    </li>
                  )
                })}
          </ul>
        </section>

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

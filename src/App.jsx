
import { useCallback, useEffect, useState } from "react";
import Search from "./components/Search.jsx";
import Spinner from "./components/Spinner.jsx";
import MovieCard from "./components/MovieCard.jsx";
import { useDebounce } from "react-use";
import { getTrendingMovies, updateSearchCount } from "./appwrite.js";
import PropTypes from "prop-types";

const API_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w342";

const API_OPTIONS = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
};

const TrendingPoster = ({ movie }) => {
  const [imageFailed, setImageFailed] = useState(false);

  const poster = movie.poster_url || movie.posterUrl || movie.poster_path || "";

  const posterUrl = poster
    ? poster.startsWith("http")
      ? poster
      : `${IMAGE_BASE_URL}/${poster.replace(/^\/+/, "")}`
    : "";

  if (!posterUrl || imageFailed) {
    return (
      <div className="trend-poster-fallback" aria-label="Poster unavailable">
        🎬
      </div>
    );
  }

  return (
    <img
      className="trend-poster"
      src={posterUrl}
      alt={`${movie.title || "Movie"} poster`}
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
};

TrendingPoster.propTypes = {
  movie: PropTypes.shape({
    poster_url: PropTypes.string,
    posterUrl: PropTypes.string,
    poster_path: PropTypes.string,
    title: PropTypes.string,
  }).isRequired,
};

const App = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [movieList, setMovieList] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  useDebounce(() => {
    setDebouncedSearchTerm(searchTerm.trim());
  }, 500, [searchTerm]);

  const loadTrendingMovies = useCallback(async () => {
    setTrendingLoading(true);

    try {
      const movies = await getTrendingMovies();
      setTrendingMovies(Array.isArray(movies) ? movies.slice(0, 5) : []);
    } catch (error) {
      console.error("Error fetching trending movies:", error);
      setTrendingMovies([]);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  const fetchMovies = useCallback(async (query = "") => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (!API_KEY) {
        throw new Error(
          "TMDB API key is missing. Check VITE_TMDB_API_KEY in your .env file."
        );
      }

      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&include_adult=false`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;

      const response = await fetch(endpoint, API_OPTIONS);

      if (!response.ok) {
        const details = await response.text();
        console.error("TMDB response:", details);
        throw new Error(`TMDB request failed (${response.status}).`);
      }

      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];

      setMovieList(results);

      if (query && results.length > 0) {
        // Record the first matching movie for this search term.
        await updateSearchCount(query, results[0]);

        // Refresh Trending so new searches can appear immediately.
        await loadTrendingMovies();
      }
    } catch (error) {
      console.error("Error fetching movies:", error);

      setErrorMessage(
        error.message?.includes("API key")
          ? error.message
          : "We could not load movies. Check your TMDB API key, connection, and browser console, then try again."
      );

      setMovieList([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadTrendingMovies]);

  useEffect(() => {
    fetchMovies(debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchMovies]);

  const handleRetry = () => {
    fetchMovies(debouncedSearchTerm);
  };

  const decorativeMovies = [
    { id: "discover", title: "Popular Movies", label: "DISCOVER", icon: "🎬" },
    { id: "favorites", title: "Fan Favorites", label: "EXPLORE", icon: "🍿" },
    {
      id: "next-watch",
      title: "Movies to Discover",
      label: "YOUR NEXT WATCH",
      icon: "⭐",
    },
  ];

  const showDecorativeCards = trendingMovies.length === 0;

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
              Explore popular films, search for timeless favorites, and
              discover something new for your next movie night.
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

        <section className="trending" aria-labelledby="trending-heading">
          <div className="section-heading">
            <div>
              <p className="section-kicker">WHAT PEOPLE ARE SEARCHING</p>
              <h2 id="trending-heading">Trending Searches</h2>
            </div>

            <span className="section-tag">
              {trendingLoading
                ? "LOADING"
                : showDecorativeCards
                  ? "DISCOVER"
                  : "TOP 5"}
            </span>
          </div>

          {trendingLoading ? (
            <div className="state-panel">
              <p>Loading trending searches...</p>
            </div>
          ) : (
            <ul>
              {(showDecorativeCards ? decorativeMovies : trendingMovies).map(
                (movie, index) => (
                  <li
                    key={
                      movie.$id ||
                      movie.id ||
                      movie.movie_id ||
                      `${movie.title}-${index}`
                    }
                  >
                    <span className="trend-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    {showDecorativeCards ? (
                      <div className="trend-poster-fallback" aria-hidden="true">
                        {movie.icon}
                      </div>
                    ) : (
                      <TrendingPoster movie={movie} />
                    )}

                    <div className="trend-info">
                      <span>
                        {showDecorativeCards
                          ? movie.label
                          : `TRENDING · ${Number(movie.count || 0)} SEARCHES`}
                      </span>
                      <p title={movie.title || movie.searchTerm}>
                        {movie.title || movie.searchTerm || "Untitled movie"}
                      </p>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </section>

        <section className="all-movies" aria-labelledby="movies-heading">
          <div className="section-heading">
            <div>
              <p className="section-kicker">
                {debouncedSearchTerm
                  ? "YOUR SEARCH RESULTS"
                  : "HANDPICKED FOR DISCOVERY"}
              </p>

              <h2 id="movies-heading">
                {debouncedSearchTerm
                  ? `Results for "${debouncedSearchTerm}"`
                  : "Explore Movies"}
              </h2>
            </div>

            {!isLoading && !errorMessage && movieList.length > 0 && (
              <span className="result-count">{movieList.length} titles</span>
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
          <p className="footer-credit">Movie data provided by TMDB.</p>
        </footer>
      </div>
    </main>
  );
};

export default App;

import { Link } from "react-router-dom";

function Home({ user }) {
  return (
    <div className="page">
      <div className="hero">
        <div>
          <h1>{user ? `Welcome back, ${user.email}` : "LearnShop"}</h1>
          <p>
            Empowering professionals with curated lessons, product tools, and modern learning workflows.
          </p>
          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary">
              {user ? "Go to Dashboard" : "Secure Sign In"}
            </Link>
            <Link to="/videos" className="btn btn-secondary">
              Browse Videos
            </Link>
          </div>
        </div>

        <div className="hero-card">
          <div className="stat">
            <span>120+</span>
            <p>Premium lessons</p>
          </div>
          <div className="stat">
            <span>15K</span>
            <p>Active learners</p>
          </div>
          <div className="stat">
            <span>4.9/5</span>
            <p>Average rating</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

function Videos({ user }) {
  // Add your videos here - just edit the title and link
  const videos = [
    { title: "How to make hydrabadi biryani", link: "https://www.youtube.com/watch?v=mRNe05EADi0" },
    { title: "Babai cooking", link: "https://www.youtube.com/watch?v=Bd0JIvF20Zg" },
    { title: "Nalli mulee cooking", link: "https://www.youtube.com/watch?v=Hk7tzYMyqFg" },
  ];

  const [selectedVideo, setSelectedVideo] = useState(videos[0]);
  const [couponVerified, setCouponVerified] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [checkingCoupon, setCheckingCoupon] = useState(true);
  const navigate = useNavigate();

  // Check if coupon is already verified
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    checkCouponStatus();
  }, [user, navigate]);

  const checkCouponStatus = async () => {
    try {
      const token = user?.token;
      const response = await fetch(`${API_BASE_URL}/api/videos/check-coupon`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.verified) {
        setCouponVerified(true);
      }
    } catch (error) {
      console.log("Coupon check error:", error);
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    setCouponLoading(true);
    setCouponMessage("");

    try {
      const token = user?.token;
      const response = await fetch(`${API_BASE_URL}/api/videos/verify-coupon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ couponCode: couponInput }),
      });

      const data = await response.json();

      if (response.ok) {
        setCouponVerified(true);
        setCouponMessage("Coupon verified! Enjoy the videos.");
        setCouponInput("");
      } else {
        setCouponMessage(data.message || "Invalid coupon code");
      }
    } catch (error) {
      setCouponMessage("Error verifying coupon. Try again.");
    } finally {
      setCouponLoading(false);
    }
  };

  const embedLink = useMemo(() => {
    if (!selectedVideo?.link) return "";
    const ytWatch = selectedVideo.link.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    if (ytWatch) {
      return `https://www.youtube.com/embed/${ytWatch[1]}`;
    }
    return selectedVideo.link;
  }, [selectedVideo]);

  const isDirectVideo = selectedVideo?.link.match(/\.(mp4|webm|ogg)(\?|$)/i);

  if (!user) {
    return (
      <div className="page">
        <p>Please login to access videos.</p>
      </div>
    );
  }

  if (checkingCoupon) {
    return (
      <div className="page">
        <p>Checking access...</p>
      </div>
    );
  }

  if (!couponVerified) {
    return (
      <div className="page coupon-lock-page">
        <div className="coupon-modal">
          <div className="coupon-modal-content">
            <h2>🔒 Video Library Access</h2>
            <p>Enter the coupon code to unlock and enjoy our premium video content.</p>
            
            <form onSubmit={handleCouponSubmit} className="coupon-form">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                required
                disabled={couponLoading}
                className="coupon-input"
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={couponLoading}
              >
                {couponLoading ? "Verifying..." : "Unlock Videos"}
              </button>
            </form>

            {couponMessage && (
              <div className={`coupon-message ${couponMessage.includes("verified") ? "success" : "error"}`}>
                {couponMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>🎬 Video Library</h1>
      <p>Click on any video below to play it.</p>

      <div className="video-player">
        {isDirectVideo ? (
          <video controls className="video-frame">
            <source src={selectedVideo.link} />
            Your browser does not support this video format.
          </video>
        ) : (
          <iframe
            className="video-frame"
            src={embedLink}
            title={selectedVideo.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        )}
      </div>

      <div className="products">
        {videos.map((video) => (
          <div
            key={video.title}
            className={`card ${selectedVideo.title === video.title ? 'active' : ''}`}
            onClick={() => setSelectedVideo(video)}
            style={{ cursor: 'pointer' }}
          >
            <h3>{video.title}</h3>
            <p>Click to play</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Videos;